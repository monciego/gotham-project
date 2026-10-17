<?php

namespace App\Services;

use App\Models\Intel;
use App\Models\Resource;
use App\Models\User;
use App\Models\WeeklyReport;
use App\Support\Period;
use Carbon\CarbonImmutable;

/**
 * Alfred's weekly report: Monday to Sunday in the user's timezone, the
 * week's numbers against the week before, and a summary in his words.
 */
class ReportService
{
    public function __construct(private DailyStats $stats) {}

    /**
     * The report for the week containing `$day` (default: this week).
     * `$final` treats the week as over, for Sunday night's saved report.
     *
     * @return array<string, mixed>
     */
    public function generateWeeklyReport(User $user, ?CarbonImmutable $day = null, bool $final = false): array
    {
        $start = ($day ?? $user->today())->startOfWeek(CarbonImmutable::MONDAY);
        $week = new Period('week', $start, $start->addDays(6));
        $today = $user->today();
        // A week still under way is compared with the same days of the week before.
        $inProgress = ! $final && $today->lte($week->end);
        $previous = new Period(
            'previous',
            $start->subWeek(),
            $inProgress ? $today->max($start)->subWeek() : $week->end->subWeek(),
        );

        $focus = $this->stats->focusMinutes($user, $week);
        $missions = $this->stats->missionsCompleted($user, $week);
        $habits = $this->stats->habits($user, $week);
        $intel = $this->stats->intel($user, $week);
        $focusBefore = array_sum($this->stats->focusMinutes($user, $previous));
        $missionsBefore = array_sum($this->stats->missionsCompleted($user, $previous));
        $due = array_sum(array_column($habits, 'due'));
        $money = $user->resources()
            ->whereDate('date', '>=', $week->start)
            ->whereDate('date', '<=', $week->end)
            ->get(['type', 'amount', 'category']);

        $metrics = [
            'focus_minutes' => array_sum($focus),
            'focus_minutes_previous' => $focusBefore,
            'missions_completed' => array_sum($missions),
            'missions_completed_previous' => $missionsBefore,
            'habit_completion_rate' => $due > 0 ? (int) round(array_sum(array_column($habits, 'done')) / $due * 100) : null,
            'intel_entries' => count($intel),
            'average_mood' => $intel === [] ? null : round(array_sum(array_column($intel, 'mood')) / count($intel), 1),
            'average_energy' => $this->average(array_filter(array_column($intel, 'energy'), fn ($energy) => $energy !== null)),
            'xp_earned' => $this->stats->xpEarned($user, $week),
            'spent' => round((float) $money->where('type', 'expense')->where('category', '!=', Resource::SAVINGS_CATEGORY)->sum('amount'), 2),
            'saved' => round((float) $money->where('type', 'expense')->where('category', Resource::SAVINGS_CATEGORY)->sum('amount'), 2),
            'earned' => round((float) $money->where('type', 'income')->sum('amount'), 2),
            'cases_closed' => $user->cases()->completed()
                ->whereDate('actual_end_date', '>=', $week->start)
                ->whereDate('actual_end_date', '<=', $week->end)
                ->count(),
        ];

        $bestDay = collect($missions)
            ->map(fn (int $count, string $date) => ['date' => $date, 'missions_completed' => $count, 'focus_minutes' => $focus[$date]])
            ->filter(fn (array $day) => $day['missions_completed'] > 0)
            ->sortBy([['missions_completed', 'desc'], ['focus_minutes', 'desc']])
            ->first();

        $trophies = $user->achievements()
            ->wherePivotBetween('earned_at', [$week->startUtc(), $week->endUtc()])
            ->pluck('name')
            ->all();

        return [
            'week_start' => $week->start->toDateString(),
            'week_end' => $week->end->toDateString(),
            'in_progress' => $inProgress,
            'metrics' => $metrics,
            'best_day' => $bestDay,
            'trophies' => $trophies,
            'summary' => $this->summary($metrics, $bestDay, $trophies, $inProgress),
            'generated_at' => now()->toIso8601String(),
        ];
    }

    /** Builds this week's report and saves it, replacing any saved earlier. */
    public function store(User $user, ?CarbonImmutable $day = null): WeeklyReport
    {
        $report = $this->generateWeeklyReport($user, $day, final: true);
        // Matched with whereDate: SQLite stores dates with a time.
        $saved = $user->weeklyReports()->whereDate('week_start', $report['week_start'])->first()
            ?? $user->weeklyReports()->make(['week_start' => $report['week_start']]);
        $saved->report = $report;
        $saved->save();

        return $saved;
    }

    /**
     * @param  array<string, mixed>  $metrics
     * @param  array{date: string, missions_completed: int}|null  $bestDay
     * @param  list<string>  $trophies
     * @param  bool  $inProgress  The week isn't over: "so far", and no farewell.
     */
    private function summary(array $metrics, ?array $bestDay, array $trophies, bool $inProgress): string
    {
        $missions = $metrics['missions_completed'];
        $before = $metrics['missions_completed_previous'];
        $focus = $metrics['focus_minutes'];

        if ($missions === 0 && $focus === 0 && $metrics['intel_entries'] === 0) {
            return $inProgress
                ? 'Nothing recorded this week yet, sir. The week is young.'
                : 'A quiet week, sir. Nothing recorded. Sometimes the city needs its protector rested. Next week, we begin again.';
        }

        $lines = [match (true) {
            $inProgress && $missions > $before => 'Ahead of last week\'s pace, sir.',
            $inProgress && $missions < $before => 'Behind last week\'s pace so far, sir.',
            $inProgress => 'Level with last week so far, sir.',
            $missions > $before && $missions >= 5 => 'A strong week, sir.',
            $missions > $before => 'Better than last week, sir.',
            $missions < $before => 'A quieter week than the last, sir.',
            default => 'A steady week, sir.',
        }];

        $trend = match (true) {
            $missions > $before => sprintf(' (%d more than %s)', $missions - $before, $inProgress ? 'by this point last week' : 'last week'),
            $missions < $before => sprintf(' (%d fewer than %s)', $before - $missions, $inProgress ? 'by this point last week' : 'last week'),
            default => '',
        };
        $lines[] = sprintf(
            'You completed %d %s%s and spent %s in focus.',
            $missions,
            $missions === 1 ? 'mission' : 'missions',
            $trend,
            $this->duration($focus),
        );

        if ($bestDay !== null) {
            $lines[] = sprintf(
                '%s was your finest day: %d %s closed.',
                CarbonImmutable::parse($bestDay['date'])->format('l'),
                $bestDay['missions_completed'],
                $bestDay['missions_completed'] === 1 ? 'mission' : 'missions',
            );
        }

        $rate = $metrics['habit_completion_rate'];
        if ($rate !== null) {
            $lines[] = match (true) {
                $rate >= 80 => "The Arsenal held at {$rate}%. Discipline, sir.",
                $rate >= 50 => "The Arsenal stood at {$rate}%. Room to tighten.",
                default => "The Arsenal slipped to {$rate}%. A setback, not a defeat.",
            };
        }

        if ($metrics['average_mood'] !== null) {
            $mood = array_search((int) round($metrics['average_mood']), Intel::MOOD_SCORES, true);
            $lines[] = sprintf(
                'Across %d journal %s, you felt %s on average.',
                $metrics['intel_entries'],
                $metrics['intel_entries'] === 1 ? 'entry' : 'entries',
                $mood,
            );
        }

        if ($metrics['spent'] > 0) {
            $lines[] = sprintf('Resources: $%s spent.', number_format($metrics['spent'], 2));
        }

        if ($metrics['cases_closed'] > 0) {
            $lines[] = $metrics['cases_closed'] === 1 ? 'A case closed. Batman would be proud.' : "{$metrics['cases_closed']} cases closed. Batman would be proud.";
        }

        if ($trophies !== []) {
            $lines[] = 'Trophies earned: '.implode(', ', $trophies).'.';
        }

        $lines[] = $inProgress ? 'The week isn\'t over, sir. There is time yet.' : 'Rest well. Next week, we go again.';

        return implode(' ', $lines);
    }

    /** "3h 20m", "45m". */
    private function duration(int $minutes): string
    {
        $hours = intdiv($minutes, 60);

        return $hours > 0 ? sprintf('%dh %02dm', $hours, $minutes % 60) : "{$minutes}m";
    }

    /** @param  array<int|string, int>  $values */
    private function average(array $values): ?float
    {
        return $values === [] ? null : round(array_sum($values) / count($values), 1);
    }
}
