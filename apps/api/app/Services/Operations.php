<?php

namespace App\Services;

use App\Models\Arsenal;
use App\Models\Operation;
use App\Models\User;
use Carbon\CarbonImmutable;

/**
 * The calendar: events (with recurring ones expanded into occurrences),
 * habits with a reminder time, and where focus blocks should go.
 */
class Operations
{
    /** Occurrences of one recurring event per request, at most. */
    private const MAX_OCCURRENCES = 500;

    /** Habits are only laid out on ranges up to this long (a month view, with margin). */
    private const HABIT_RANGE_DAYS = 62;

    private const HABIT_MINUTES = 30;

    /** Focus blocks end by this hour. */
    private const LATEST_END_HOUR = 22;

    /**
     * Everything on the calendar that overlaps [from, to), by start.
     *
     * @return list<array<string, mixed>>
     */
    public function between(User $user, CarbonImmutable $from, CarbonImmutable $to): array
    {
        $operations = $user->operations()
            ->with('mission:id,title,status')
            ->where('start_time', '<', $to)
            ->where(fn ($query) => $query->where('end_time', '>', $from)->orWhere('recurring', true))
            ->get();

        $entries = $operations
            ->flatMap(fn (Operation $operation) => $this->expand($operation, $from, $to, $user->timezone))
            ->merge($this->habits($user, $from, $to))
            ->sortBy(fn (array $entry) => $entry['sort'])
            ->map(fn (array $entry) => collect($entry)->except('sort')->all())
            ->values();

        return $entries->all();
    }

    /**
     * A single operation as the API returns it outside the calendar (its
     * series, not an occurrence).
     *
     * @return array<string, mixed>
     */
    public function present(Operation $operation, string $timezone): array
    {
        return collect($this->entry($operation, $operation->start_time, $operation->end_time, null, $timezone))->except('sort')->all();
    }

    /**
     * Where a 2-hour focus block should start on a day: the user's energy
     * peak if Alfred has found one, else an hour after work starts (10:00
     * without work hours). Moved to the next free half hour if something's
     * already there, and never in the past.
     *
     * `moved` is true when the first choice was taken or already past.
     *
     * @return array{start: CarbonImmutable, reason: string, moved: bool}
     */
    public function suggestFocusStart(User $user, CarbonImmutable $day): array
    {
        $tz = $user->timezone;
        $day = $day->setTimezone($tz)->startOfDay();

        $peak = $user->systemIntelligence()->ofType('energy_pattern')->confident()->latest('updated_at')->first()?->pattern_data['peak_hour'] ?? null;

        if (is_int($peak) && $peak >= 0 && $peak <= self::LATEST_END_HOUR - 2) {
            [$start, $reason] = [$day->setTime($peak, 0), 'energy_pattern'];
        } else {
            $workStart = $user->work_start_time ? substr($user->work_start_time, 0, 5) : '09:00';
            [$start, $reason] = [$day->setTimeFromTimeString($workStart)->addHour(), $user->work_start_time ? 'work_start' : 'default'];
        }

        $preferred = $start;
        $now = CarbonImmutable::now($tz);
        if ($start->lt($now)) {
            // The next half hour.
            $start = $now->addMinutes(30 - $now->minute % 30)->startOfMinute();
        }

        $busy = collect($this->between($user, $day->utc(), $day->addDay()->utc()))
            ->filter(fn (array $entry) => $entry['kind'] !== 'habit' && ! $entry['all_day'])
            ->map(fn (array $entry) => [CarbonImmutable::parse($entry['start']), CarbonImmutable::parse($entry['end'])]);
        $latestStart = $day->setTime(self::LATEST_END_HOUR, 0)->subMinutes(Operation::FOCUS_BLOCK_MINUTES);

        for ($candidate = $start; $candidate->lte($latestStart); $candidate = $candidate->addMinutes(30)) {
            $end = $candidate->addMinutes(Operation::FOCUS_BLOCK_MINUTES);
            if ($busy->doesntContain(fn (array $slot) => $slot[0]->lt($end) && $slot[1]->gt($candidate))) {
                return ['start' => $candidate->utc(), 'reason' => $reason, 'moved' => ! $candidate->equalTo($preferred)];
            }
        }

        // A full day: suggest the first choice anyway.
        return ['start' => $start->utc(), 'reason' => $reason, 'moved' => ! $start->equalTo($preferred)];
    }

    /** A timed event linked to a mission sets the mission's due time to its start. */
    public function syncMission(Operation $operation, string $timezone): void
    {
        if ($operation->mission === null || $operation->all_day) {
            return;
        }

        $operation->mission->update(['due_time' => $operation->start_time->setTimezone($timezone)->format('H:i')]);
    }

    /** @return list<array<string, mixed>> */
    private function expand(Operation $operation, CarbonImmutable $from, CarbonImmutable $to, string $tz): array
    {
        $freq = $operation->recurring ? ($operation->recurring_rule['freq'] ?? null) : null;

        if ($freq === null) {
            return $operation->start_time->lt($to) && $operation->end_time->gt($from)
                ? [$this->entry($operation, $operation->start_time, $operation->end_time, null, $tz)]
                : [];
        }

        $duration = (int) $operation->start_time->diffInSeconds($operation->end_time);
        $until = isset($operation->recurring_rule['until'])
            ? CarbonImmutable::parse($operation->recurring_rule['until'], $tz)->endOfDay()->utc()
            : null;

        // Daily and weekly series can jump close to the range instead of walking there.
        $period = ['daily' => 86400, 'weekly' => 604800][$freq] ?? null;
        $first = $period ? max(0, intdiv(max(0, (int) $operation->start_time->diffInSeconds($from) - $duration), $period) - 1) : 0;

        $entries = [];
        for ($n = $first; $n < $first + self::MAX_OCCURRENCES; $n++) {
            $start = $this->occurrence($operation, $n, $tz);
            if ($start->gte($to) || ($until && $start->gt($until))) {
                break;
            }

            $end = $start->addSeconds($duration);
            if ($end->gt($from)) {
                $entries[] = $this->entry($operation, $start, $end, $n, $tz);
            }
        }

        return $entries;
    }

    /** The nth start, stepped in the user's timezone so a 9:00 meeting stays at 9:00 across DST. */
    private function occurrence(Operation $operation, int $n, string $tz): CarbonImmutable
    {
        $local = $operation->start_time->setTimezone($tz);

        $start = match ($operation->recurring_rule['freq']) {
            'daily' => $local->addDays($n),
            'weekly' => $local->addWeeks($n),
            'monthly' => $local->addMonthsNoOverflow($n),
            default => $local->addYearsNoOverflow($n),
        };

        return $start->utc();
    }

    /** @return array<string, mixed> */
    private function entry(Operation $operation, CarbonImmutable $start, CarbonImmutable $end, ?int $occurrence, string $tz): array
    {
        return [
            'id' => $occurrence === null ? "op-{$operation->id}" : "op-{$operation->id}-{$occurrence}",
            'operation_id' => $operation->id,
            'occurrence' => $occurrence,
            'kind' => $operation->kind,
            'title' => $operation->title,
            'description' => $operation->description,
            ...$this->times($start, $end, $operation->all_day, $tz),
            // The series' own times, for dragging one occurrence to move them all.
            'series_start' => $this->time($operation->start_time, $operation->all_day, $tz),
            'series_end' => $this->time($operation->end_time, $operation->all_day, $tz),
            'all_day' => $operation->all_day,
            'category' => $operation->category,
            'color' => $operation->color,
            'recurring' => $operation->recurring,
            'recurring_rule' => $operation->recurring ? $operation->recurring_rule : null,
            'reminder_minutes' => $operation->reminder_minutes,
            'mission' => $operation->mission ? [
                'id' => $operation->mission->id,
                'title' => $operation->mission->title,
                'status' => $operation->mission->status,
            ] : null,
            'editable' => true,
            'sort' => $start->timestamp,
        ];
    }

    /**
     * Read-only entries for habits with a reminder time, on the days they're
     * due. Weekly and interval habits have no fixed days, so they're left out.
     *
     * @return list<array<string, mixed>>
     */
    private function habits(User $user, CarbonImmutable $from, CarbonImmutable $to): array
    {
        if ($from->diffInDays($to) > self::HABIT_RANGE_DAYS) {
            return [];
        }

        $tz = $user->timezone;
        $mode = $user->current_mode ?? 'bruce';
        $habits = $user->arsenal()->active()
            ->whereNotNull('reminder_time')
            ->whereIn('type', ['daily', 'measurable', 'yes_no', 'specific_days'])
            ->get()
            ->filter(fn (Arsenal $habit) => $habit->allowsMode($mode));

        $entries = [];
        for ($day = $from->setTimezone($tz)->startOfDay(); $day->lt($to); $day = $day->addDay()) {
            foreach ($habits as $habit) {
                $due = $habit->type !== 'specific_days' || in_array($day->dayOfWeekIso, $habit->frequency['days'] ?? [], true);
                if (! $due || $day->lt($habit->startDate($tz))) {
                    continue;
                }

                $start = $day->setTimeFromTimeString($habit->reminder_time)->utc();
                if ($start->lt($from) || $start->gte($to)) {
                    continue;
                }

                $entries[] = [
                    'id' => "habit-{$habit->id}-{$day->toDateString()}",
                    'operation_id' => null,
                    'habit_id' => $habit->id,
                    'kind' => 'habit',
                    'title' => $habit->name,
                    ...$this->times($start, $start->addMinutes(self::HABIT_MINUTES), false, $tz),
                    'all_day' => false,
                    'category' => 'health',
                    'editable' => false,
                    'sort' => $start->timestamp,
                ];
            }
        }

        return $entries;
    }

    /** @return array{start: string, end: string} */
    private function times(CarbonImmutable $start, CarbonImmutable $end, bool $allDay, string $tz): array
    {
        return ['start' => $this->time($start, $allDay, $tz), 'end' => $this->time($end, $allDay, $tz)];
    }

    /** All-day times as the user's local date (end exclusive); others as UTC ISO 8601. */
    private function time(CarbonImmutable $time, bool $allDay, string $tz): string
    {
        return $allDay ? $time->setTimezone($tz)->toDateString() : $time->utc()->toIso8601ZuluString();
    }
}
