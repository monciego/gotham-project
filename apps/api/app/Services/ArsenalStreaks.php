<?php

namespace App\Services;

use App\Models\Arsenal;
use App\Models\ArsenalLog;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

/**
 * When habits are due, and their streaks.
 *
 * Streaks count consecutive due days completed (consecutive weeks meeting
 * the target for weekly habits). Days a habit isn't due and intentional
 * skips neither count nor break a streak, and today only breaks it once the
 * day is over. In some modes a few misses in a row are forgiven
 * (`gotham.arsenal.grace`).
 */
class ArsenalStreaks
{
    /** How far back streaks are calculated. */
    public const WINDOW_DAYS = 366;

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

    /** Misses in a row forgiven in the user's current mode. */
    public function grace(User $user): int
    {
        return max(0, (int) config("gotham.arsenal.grace.{$this->mode($user)}", 0));
    }

    /**
     * Every day from the habit's first day (or the window's) to today, keyed
     * by Y-m-d: whether it was due, and its state.
     *
     * States: completed, skipped, missed (due, not done, over), pending (due
     * today, not done yet) and off (not due). Weekly habits have no due days;
     * their days are completed, skipped or off.
     *
     * @param  Collection<string, ArsenalLog>  $logs
     * @return array<string, array{due: bool, state: string, value: int|null}>
     */
    public function timeline(Arsenal $habit, Collection $logs, CarbonImmutable $today, string $timezone): array
    {
        $days = [];
        // Interval habits count from the last day done or skipped.
        $anchor = null;
        $every = max(1, (int) ($habit->frequency['every'] ?? 1));

        for ($day = $this->firstDay($habit, $today, $timezone); $day->lte($today); $day = $day->addDay()) {
            $log = $logs->get($day->toDateString());
            $due = match ($habit->type) {
                'weekly' => false,
                'specific_days' => in_array($day->dayOfWeekIso, $habit->frequency['days'] ?? [], true),
                'interval' => $anchor === null || (int) $anchor->diffInDays($day) >= $every,
                default => true,
            };

            $state = match (true) {
                (bool) $log?->completed => 'completed',
                (bool) $log?->skipped => 'skipped',
                $due && $day->lt($today) => 'missed',
                $due => 'pending',
                default => 'off',
            };

            if (in_array($state, ['completed', 'skipped'], true)) {
                $anchor = $day;
            }

            $days[$day->toDateString()] = ['due' => $due, 'state' => $state, 'value' => $log?->value];
        }

        return $days;
    }

    /**
     * `misses` is how many due days (or weeks) in a row were missed most recently.
     *
     * @param  Collection<string, ArsenalLog>  $logs
     * @return array{current: int, best: int, misses: int}
     */
    public function calculate(Arsenal $habit, Collection $logs, CarbonImmutable $today, string $timezone, int $grace = 0): array
    {
        return $habit->isWeekly()
            ? $this->weekly($habit, $logs, $this->firstDay($habit, $today, $timezone), $today, $grace)
            : $this->daily($this->timeline($habit, $logs, $today, $timezone), $grace);
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
        $streak = $this->calculate($habit, $logs, $today, $user->timezone, $this->grace($user));
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
     * Whether the habit belongs on today's list: active, meant for the
     * user's current mode, and due (by its frequency).
     *
     * @param  Collection<string, ArsenalLog>  $logs
     * @param  array<string, array{due: bool, state: string, value: int|null}>|null  $timeline  When already computed.
     */
    public function isActiveToday(Arsenal $habit, Collection $logs, User $user, ?array $timeline = null): bool
    {
        if (! $habit->active || ! $habit->allowsMode($this->mode($user))) {
            return false;
        }

        $today = $user->today();

        if ($habit->isWeekly()) {
            // Listed until the week's target is met, and on the day that met it.
            return $this->completedInWeek($logs, $today) < $this->weeklyTarget($habit)
                || (bool) $logs->get($today->toDateString())?->completed;
        }

        $timeline ??= $this->timeline($habit, $logs, $today, $user->timezone);
        $todayEntry = $timeline[$today->toDateString()] ?? null;

        // A habit done or skipped today stays listed, so it shows as done.
        return $todayEntry !== null && ($todayEntry['due'] || $todayEntry['state'] !== 'off');
    }

    /**
     * A habit with today's state and streaks, as the lists, HQ and check-ins return it.
     *
     * @param  Collection<string, ArsenalLog>  $logs
     * @return array<string, mixed>
     */
    public function present(Arsenal $habit, Collection $logs, User $user): array
    {
        $today = $user->today();
        $grace = $this->grace($user);
        $log = $logs->get($today->toDateString());
        $timeline = $this->timeline($habit, $logs, $today, $user->timezone);
        $streak = $habit->isWeekly()
            ? $this->weekly($habit, $logs, $this->firstDay($habit, $today, $user->timezone), $today, $grace)
            : $this->daily($timeline, $grace);
        $activeToday = $this->isActiveToday($habit, $logs, $user, $timeline);
        $completed = (bool) $log?->completed;
        $skipped = (bool) $log?->skipped;

        return [
            'id' => $habit->id,
            'name' => $habit->name,
            'description' => $habit->description,
            'category' => $habit->category,
            'type' => $habit->type,
            'frequency' => $habit->frequency,
            'target_value' => $habit->target_value,
            'unit' => $habit->unit,
            'reminder_time' => $habit->reminder_time ? substr($habit->reminder_time, 0, 5) : null,
            'active' => $habit->active,
            'mode_specific' => $habit->mode_specific ?? [],
            'created_at' => $habit->created_at,
            'active_today' => $activeToday,
            'completed' => $completed,
            'skipped' => $skipped,
            'value' => $log?->value,
            'note' => $log?->note,
            'current_streak' => $streak['current'],
            'best_streak' => max($streak['best'], $habit->best_streak),
            'streak_unit' => $habit->isWeekly() ? 'weeks' : 'days',
            // Missing today would end a streak worth protecting (Alfred warns in the evening).
            'streak_at_risk' => $activeToday && ! $completed && ! $skipped && ! $habit->isWeekly()
                && $streak['current'] > 3 && $grace < $streak['misses'] + 1,
            'week_progress' => $habit->isWeekly() ? [
                'done' => $this->completedInWeek($logs, $today),
                'target' => $this->weeklyTarget($habit),
            ] : null,
            'month_rate' => $this->rate(
                $habit,
                array_filter(
                    $timeline,
                    fn (string $date) => $date >= $today->startOfMonth()->toDateString(),
                    ARRAY_FILTER_USE_KEY,
                ),
            ),
        ];
    }

    /**
     * Completion rate (0–100) over some timeline days, or null with nothing to rate yet.
     * Weekly habits: completions against the weekly target, pro rata.
     *
     * @param  array<string, array{due: bool, state: string, value: int|null}>  $days
     */
    public function rate(Arsenal $habit, array $days): ?int
    {
        if ($days === []) {
            return null;
        }

        $states = collect($days);

        if ($habit->isWeekly()) {
            $expected = $this->weeklyTarget($habit) * count($days) / 7;

            return (int) round(min(1, $states->where('state', 'completed')->count() / $expected) * 100);
        }

        $done = $states->where('due', true)->where('state', 'completed')->count();
        $missed = $states->where('state', 'missed')->count();

        return $done + $missed === 0 ? null : (int) round($done / ($done + $missed) * 100);
    }

    public function weeklyTarget(Arsenal $habit): int
    {
        return max(1, (int) ($habit->frequency['times'] ?? 1));
    }

    /** A user created in memory hasn't loaded the column's default yet. */
    private function mode(User $user): string
    {
        return $user->current_mode ?? 'bruce';
    }

    /** The habit's first day, or the start of the streak window for older habits. */
    private function firstDay(Arsenal $habit, CarbonImmutable $today, string $timezone): CarbonImmutable
    {
        return $habit->startDate($timezone)->max($today->subDays(self::WINDOW_DAYS));
    }

    /**
     * @param  array<string, array{due: bool, state: string, value: int|null}>  $timeline
     * @return array{current: int, best: int, misses: int}
     */
    private function daily(array $timeline, int $grace): array
    {
        $run = $best = $misses = 0;

        foreach ($timeline as $day) {
            if (! $day['due']) {
                continue;
            }

            if ($day['state'] === 'completed') {
                $best = max($best, ++$run);
                $misses = 0;
            } elseif ($day['state'] === 'missed' && ++$misses > $grace) {
                $run = 0;
            }
        }

        return ['current' => $run, 'best' => $best, 'misses' => $misses];
    }

    /** @return array{current: int, best: int, misses: int} */
    private function weekly(Arsenal $habit, Collection $logs, CarbonImmutable $start, CarbonImmutable $today, int $grace): array
    {
        $run = $best = $misses = 0;
        $target = $this->weeklyTarget($habit);
        $thisWeek = $today->startOfWeek(CarbonImmutable::MONDAY);

        for ($week = $start->startOfWeek(CarbonImmutable::MONDAY); $week->lte($thisWeek); $week = $week->addWeek()) {
            if ($this->completedInWeek($logs, $week) >= $target) {
                $best = max($best, ++$run);
                $misses = 0;
            } elseif (! $week->equalTo($thisWeek) && ++$misses > $grace) {
                $run = 0;
            }
        }

        return ['current' => $run, 'best' => $best, 'misses' => $misses];
    }

    private function completedInWeek(Collection $logs, CarbonImmutable $dayInWeek): int
    {
        $monday = $dayInWeek->startOfWeek(CarbonImmutable::MONDAY);

        return $logs->filter(fn (ArsenalLog $log, string $date) => $log->completed
            && $date >= $monday->toDateString()
            && $date <= $monday->addDays(6)->toDateString()
        )->count();
    }
}
