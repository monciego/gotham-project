<?php

namespace App\Services;

use App\Models\Arsenal;
use App\Models\ArsenalLog;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

/**
 * Streaks count consecutive due days completed (consecutive weeks meeting
 * the target for weekly habits). Skipped days neither count nor break a
 * streak, and today only breaks it once the day is over.
 */
class ArsenalStreaks
{
    /** How far back streaks are calculated. */
    private const WINDOW_DAYS = 366;

    public const MILESTONES = [7, 30, 100];

    /**
     * Logs in the streak window, grouped by habit id and keyed by Y-m-d date.
     *
     * @param  Collection<int, Arsenal>  $habits
     * @return Collection<int, Collection<string, ArsenalLog>>
     */
    public function logsFor(Collection $habits, CarbonImmutable $today): Collection
    {
        return ArsenalLog::query()
            ->whereIn('arsenal_id', $habits->pluck('id'))
            ->whereDate('date', '>=', $today->subDays(self::WINDOW_DAYS))
            ->whereDate('date', '<=', $today)
            ->get()
            ->groupBy('arsenal_id')
            ->map(fn (Collection $logs) => $logs->keyBy(fn (ArsenalLog $log) => $log->date->toDateString()));
    }

    /**
     * @param  Collection<string, ArsenalLog>  $logs
     * @return array{current: int, best: int}
     */
    public function calculate(Arsenal $habit, Collection $logs, CarbonImmutable $today, string $timezone): array
    {
        $start = $habit->startDate($timezone)->max($today->subDays(self::WINDOW_DAYS));

        return $habit->isWeekly()
            ? $this->weekly($habit, $logs, $start, $today)
            : $this->daily($habit, $logs, $start, $today, $timezone);
    }

    /**
     * Recalculates and saves a habit's streaks after its logs change.
     *
     * @return array{before: int, after: int}
     */
    public function refresh(Arsenal $habit, User $user): array
    {
        $today = $user->today();
        $logs = $this->logsFor(collect([$habit]), $today)->get($habit->id, collect());
        $streak = $this->calculate($habit, $logs, $today, $user->timezone);
        $before = $habit->current_streak;

        // Runs older than the window can't be recounted, so keep the stored best for old habits.
        $windowCoversHistory = $habit->startDate($user->timezone)->gte($today->subDays(self::WINDOW_DAYS));

        $habit->update([
            'current_streak' => $streak['current'],
            'best_streak' => $windowCoversHistory ? $streak['best'] : max($streak['best'], $habit->best_streak),
        ]);

        return ['before' => $before, 'after' => $streak['current']];
    }

    /** The milestone crossed when a streak grows from $before to $after, if any. */
    public function milestoneReached(int $before, int $after): ?int
    {
        foreach (self::MILESTONES as $milestone) {
            if ($before < $milestone && $after >= $milestone) {
                return $milestone;
            }
        }

        return null;
    }

    /**
     * A habit as the dashboard shows it today.
     *
     * @param  Collection<string, ArsenalLog>  $logs
     * @return array<string, mixed>
     */
    public function present(Arsenal $habit, Collection $logs, CarbonImmutable $today, string $timezone): array
    {
        $log = $logs->get($today->toDateString());
        $streak = $this->calculate($habit, $logs, $today, $timezone);

        return [
            'id' => $habit->id,
            'name' => $habit->name,
            'category' => $habit->category,
            'type' => $habit->type,
            'target_value' => $habit->target_value,
            'unit' => $habit->unit,
            'completed' => (bool) $log?->completed,
            'value' => $log?->value,
            'current_streak' => $streak['current'],
            'best_streak' => max($streak['best'], $habit->best_streak),
            'streak_unit' => $habit->isWeekly() ? 'weeks' : 'days',
            'week_progress' => $habit->isWeekly() ? [
                'done' => $this->completedInWeek($logs, $today),
                'target' => $this->weeklyTarget($habit),
            ] : null,
        ];
    }

    /** Whether the habit belongs on today's list. */
    public function isDueToday(Arsenal $habit, Collection $logs, CarbonImmutable $today, string $timezone): bool
    {
        if (! $habit->isWeekly()) {
            return $habit->isDueOn($today, $timezone);
        }

        // Weekly habits stay listed until the week's target is met, and on the day that met it.
        return $this->completedInWeek($logs, $today) < $this->weeklyTarget($habit)
            || (bool) $logs->get($today->toDateString())?->completed;
    }

    /** @return array{current: int, best: int} */
    private function daily(Arsenal $habit, Collection $logs, CarbonImmutable $start, CarbonImmutable $today, string $timezone): array
    {
        $run = $best = 0;

        for ($day = $start; $day->lte($today); $day = $day->addDay()) {
            if (! $habit->isDueOn($day, $timezone)) {
                continue;
            }

            $log = $logs->get($day->toDateString());

            if ($log?->completed) {
                $best = max($best, ++$run);
            } elseif (! $log?->skipped && ! $day->equalTo($today)) {
                $run = 0;
            }
        }

        return ['current' => $run, 'best' => $best];
    }

    /** @return array{current: int, best: int} */
    private function weekly(Arsenal $habit, Collection $logs, CarbonImmutable $start, CarbonImmutable $today): array
    {
        $run = $best = 0;
        $target = $this->weeklyTarget($habit);
        $thisWeek = $today->startOfWeek(CarbonImmutable::MONDAY);

        for ($week = $start->startOfWeek(CarbonImmutable::MONDAY); $week->lte($thisWeek); $week = $week->addWeek()) {
            if ($this->completedInWeek($logs, $week) >= $target) {
                $best = max($best, ++$run);
            } elseif (! $week->equalTo($thisWeek)) {
                $run = 0;
            }
        }

        return ['current' => $run, 'best' => $best];
    }

    private function completedInWeek(Collection $logs, CarbonImmutable $dayInWeek): int
    {
        $monday = $dayInWeek->startOfWeek(CarbonImmutable::MONDAY);

        return $logs->filter(fn (ArsenalLog $log, string $date) => $log->completed
            && $date >= $monday->toDateString()
            && $date <= $monday->addDays(6)->toDateString()
        )->count();
    }

    private function weeklyTarget(Arsenal $habit): int
    {
        return max(1, (int) ($habit->frequency['times'] ?? 1));
    }
}
