<?php

namespace App\Services;

use App\Models\Arsenal;
use App\Models\User;
use App\Support\Period;
use Carbon\CarbonImmutable;

/** The Overview page's numbers for a period. */
class Overview
{
    public function __construct(
        private DailyStats $stats,
        private ArsenalStreaks $streaks,
    ) {}

    /** @return array<string, mixed> */
    public function for(User $user, Period $period): array
    {
        $focus = $this->stats->focusMinutes($user, $period);
        $missions = $this->stats->missionsCompleted($user, $period);
        $previousMissions = array_sum($this->stats->missionsCompleted($user, $period->previous()));
        $habits = $this->stats->habits($user, $period);
        $intel = $this->stats->intel($user, $period);
        $due = array_sum(array_column($habits, 'due'));
        $completed = array_sum($missions);

        return [
            'period' => $period->toArray(),
            'key_metrics' => [
                'total_focus_minutes' => array_sum($focus),
                'missions_completed' => $completed,
                'missions_completed_previous' => $previousMissions,
                // Against the same number of days just before; null when there was nothing to compare with.
                'missions_change' => $previousMissions > 0 ? (int) round(($completed - $previousMissions) / $previousMissions * 100) : null,
                'habit_completion_rate' => $due > 0 ? (int) round(array_sum(array_column($habits, 'done')) / $due * 100) : null,
                'active_streaks_count' => $this->activeStreaks($user),
                'xp_earned' => $this->stats->xpEarned($user, $period),
            ],
            'focus_by_day' => collect($focus)->map(fn (int $minutes, string $date) => ['date' => $date, 'minutes' => $minutes])->values(),
            'missions_by_week' => collect($missions)
                ->groupBy(fn (int $count, string $date) => CarbonImmutable::parse($date)->startOfWeek(CarbonImmutable::MONDAY)->toDateString(), preserveKeys: true)
                ->map(fn ($counts, string $week) => ['week' => $week, 'count' => $counts->sum()])
                ->values(),
            // Null on days nothing was due.
            'habit_heatmap' => collect($habits)->map(fn (array $day, string $date) => [
                'date' => $date,
                'completion_rate' => $day['due'] > 0 ? (int) round($day['done'] / $day['due'] * 100) : null,
            ])->values(),
            'energy_trend' => collect($intel)
                ->filter(fn (array $day) => $day['energy'] !== null)
                ->map(fn (array $day, string $date) => ['date' => $date, 'avg_energy' => $day['energy']])
                ->values(),
            'mood_trend' => collect($intel)->map(fn (array $day, string $date) => ['date' => $date, 'mood_score' => $day['mood']])->values(),
        ];
    }

    /** Active habits with a streak going right now. */
    private function activeStreaks(User $user): int
    {
        $today = $user->today();
        $habits = $user->arsenal()->where('active', true)->get();
        $logs = $this->streaks->logsFor($habits, $today);
        $grace = $this->streaks->grace($user);

        return $habits->filter(fn (Arsenal $habit) => $this->streaks->calculate(
            $habit,
            $logs->get($habit->id, collect()),
            $today,
            $user->timezone,
            $grace,
        )['current'] > 0)->count();
    }
}
