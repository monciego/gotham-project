<?php

namespace App\Services;

use App\Models\Arsenal;
use App\Models\User;
use Carbon\CarbonImmutable;

/** The numbers behind a habit's detail page. Due days and states come from ArsenalStreaks. */
class ArsenalAnalytics
{
    /** Heatmap length, in weeks starting on Sunday. */
    private const HEATMAP_WEEKS = 52;

    public function __construct(private ArsenalStreaks $streaks) {}

    /**
     * @return array{
     *     completion_rate: int|null,
     *     heatmap: list<array{date: string, state: string, value: int|null}>,
     *     last_30_days: list<array{date: string, rate: int|null}>,
     *     by_weekday: list<array{weekday: int, rate: int|null}>,
     * }
     */
    public function for(Arsenal $habit, User $user): array
    {
        $today = $user->today();
        $logs = $this->streaks->logsFor(collect([$habit]), $today)->get($habit->id, collect());
        $timeline = $this->streaks->timeline($habit, $logs, $today, $user->timezone);

        return [
            'completion_rate' => $this->streaks->rate($habit, $timeline),
            'heatmap' => $this->heatmap($timeline, $today),
            'last_30_days' => $this->rolling($habit, $timeline, $today),
            'by_weekday' => $this->byWeekday($habit, $timeline),
        ];
    }

    /**
     * Every day of the last 52 weeks (Sunday to Saturday), oldest first.
     * Days before the habit existed are "none".
     */
    private function heatmap(array $timeline, CarbonImmutable $today): array
    {
        $days = [];
        $from = $today->startOfWeek(CarbonImmutable::SUNDAY)->subWeeks(self::HEATMAP_WEEKS - 1);

        for ($day = $from; $day->lte($today); $day = $day->addDay()) {
            $entry = $timeline[$day->toDateString()] ?? null;
            $days[] = [
                'date' => $day->toDateString(),
                'state' => $entry['state'] ?? 'none',
                'value' => $entry['value'] ?? null,
            ];
        }

        return $days;
    }

    /** Each of the last 30 days: the completion rate over the 7 days ending that day. */
    private function rolling(Arsenal $habit, array $timeline, CarbonImmutable $today): array
    {
        $points = [];

        for ($day = $today->subDays(29); $day->lte($today); $day = $day->addDay()) {
            $points[] = [
                'date' => $day->toDateString(),
                'rate' => $this->streaks->rate($habit, $this->between($timeline, $day->subDays(6), $day)),
            ];
        }

        return $points;
    }

    /**
     * Completion rate by ISO weekday (1 = Monday). Weekly habits have no due
     * days, so theirs is the share of those weekdays they were done on.
     */
    private function byWeekday(Arsenal $habit, array $timeline): array
    {
        $rates = [];

        foreach (range(1, 7) as $weekday) {
            $days = array_filter(
                $timeline,
                fn (string $date) => CarbonImmutable::parse($date)->dayOfWeekIso === $weekday,
                ARRAY_FILTER_USE_KEY,
            );

            $rates[] = [
                'weekday' => $weekday,
                'rate' => $habit->isWeekly()
                    ? ($days === [] ? null : (int) round(collect($days)->where('state', 'completed')->count() / count($days) * 100))
                    : $this->streaks->rate($habit, $days),
            ];
        }

        return $rates;
    }

    private function between(array $timeline, CarbonImmutable $from, CarbonImmutable $to): array
    {
        return array_filter(
            $timeline,
            fn (string $date) => $date >= $from->toDateString() && $date <= $to->toDateString(),
            ARRAY_FILTER_USE_KEY,
        );
    }
}
