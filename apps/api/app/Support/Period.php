<?php

namespace App\Support;

use Carbon\CarbonImmutable;

/**
 * A run of whole days in the user's timezone, both ends included.
 * Named periods start at the start of the current week (Monday), month,
 * quarter or year and run to today.
 */
final class Period
{
    public const NAMES = ['week', 'month', 'quarter', 'year', 'custom'];

    /** The longest custom period. */
    public const MAX_DAYS = 366;

    public function __construct(
        public readonly string $name,
        public readonly CarbonImmutable $start,
        public readonly CarbonImmutable $end,
    ) {}

    public static function named(string $name, CarbonImmutable $today): self
    {
        $start = match ($name) {
            'week' => $today->startOfWeek(CarbonImmutable::MONDAY),
            'month' => $today->startOfMonth(),
            'quarter' => $today->startOfQuarter(),
            'year' => $today->startOfYear(),
        };

        return new self($name, $start, $today);
    }

    /** Dates are Y-m-d in the user's timezone. */
    public static function custom(string $start, string $end, string $timezone): self
    {
        return new self(
            'custom',
            CarbonImmutable::parse($start, $timezone)->startOfDay(),
            CarbonImmutable::parse($end, $timezone)->startOfDay(),
        );
    }

    /** The same number of days just before this period, for comparisons. */
    public function previous(): self
    {
        $days = $this->days();

        return new self('previous', $this->start->subDays($days), $this->start->subDay());
    }

    public function days(): int
    {
        return (int) $this->start->diffInDays($this->end) + 1;
    }

    /** @return list<string> every Y-m-d in the period */
    public function dates(): array
    {
        $dates = [];
        for ($day = $this->start; $day->lte($this->end); $day = $day->addDay()) {
            $dates[] = $day->toDateString();
        }

        return $dates;
    }

    /** UTC bounds, for timestamp columns. */
    public function startUtc(): CarbonImmutable
    {
        return $this->start->utc();
    }

    public function endUtc(): CarbonImmutable
    {
        return $this->end->endOfDay()->utc();
    }

    /** @return array{name: string, start: string, end: string, days: int} */
    public function toArray(): array
    {
        return [
            'name' => $this->name,
            'start' => $this->start->toDateString(),
            'end' => $this->end->toDateString(),
            'days' => $this->days(),
        ];
    }
}
