<?php

namespace App\Services;

use App\Models\CaseFile;
use App\Models\CaseProgressLog;
use App\Models\FocusSession;
use Carbon\CarbonImmutable;

/** The numbers on a case's page: time put in, pace, and when it should be done. */
class CaseAnalytics
{
    /**
     * @return array{
     *     total_focus_minutes: int,
     *     missions_total: int,
     *     missions_completed: int,
     *     missions_remaining: int,
     *     missions_per_week: float,
     *     weeks_elapsed: int,
     *     estimated_completion: string|null,
     *     progress_history: list<array{date: string, progress: int}>
     * }
     */
    public function for(CaseFile $case, CarbonImmutable $today): array
    {
        $missions = $case->missions()->get(['id', 'status']);
        $completed = $missions->where('status', 'completed')->count();
        $remaining = $missions->whereIn('status', ['not_started', 'in_progress'])->count();

        $start = CarbonImmutable::parse($case->start_date->toDateString());
        // A closed case stops the clock on its end date.
        $end = CarbonImmutable::parse(($case->actual_end_date ?? $today)->toDateString());
        $days = $end->lt($start) ? 0 : (int) $start->diffInDays($end);
        // At least a week, so a burst on day one doesn't promise the moon.
        $perWeek = $completed / max(1, $days / 7);

        return [
            'total_focus_minutes' => (int) FocusSession::whereIn('mission_id', $missions->pluck('id'))
                ->completed()
                ->sum('duration_minutes'),
            'missions_total' => $missions->where('status', '!=', 'abandoned')->count(),
            'missions_completed' => $completed,
            'missions_remaining' => $remaining,
            'missions_per_week' => round($perWeek, 1),
            'weeks_elapsed' => intdiv($days, 7),
            'estimated_completion' => $this->estimate($case, $today, $days, $perWeek, $remaining),
            'progress_history' => $case->progressLogs()->orderBy('date')->get()
                ->map(fn (CaseProgressLog $log) => ['date' => $log->date->toDateString(), 'progress' => $log->progress])
                ->all(),
        ];
    }

    /**
     * At the current pace, the day the case reaches 100%: remaining missions
     * at missions per week (auto), or remaining points at points per day
     * (manual). Null without a pace to go on.
     */
    private function estimate(CaseFile $case, CarbonImmutable $today, int $days, float $perWeek, int $remaining): ?string
    {
        if ($case->status === 'completed') {
            return $case->actual_end_date?->toDateString();
        }

        if ($case->progress >= 100) {
            return $today->toDateString();
        }

        $daysLeft = match (true) {
            $case->progress_mode === 'auto' && $perWeek > 0 && $remaining > 0 => $remaining / $perWeek * 7,
            $case->progress_mode === 'manual' && $case->progress > 0 => (100 - $case->progress) / ($case->progress / max(7, $days)),
            default => null,
        };

        return $daysLeft === null ? null : $today->addDays((int) ceil($daysLeft))->toDateString();
    }
}
