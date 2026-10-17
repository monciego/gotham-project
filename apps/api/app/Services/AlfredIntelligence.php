<?php

namespace App\Services;

use App\Models\Arsenal;
use App\Models\FocusSession;
use App\Models\Mission;
use App\Models\Resource;
use App\Models\User;
use App\Support\Period;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

/**
 * Alfred's reading of the last 60 days: correlations between habits,
 * missions, focus, mood, energy and spending, as plain-language insights.
 *
 * Insights are cached for a day. The patterns behind them are saved in
 * `system_intelligence` (one row per type, replaced on each run, removed
 * when the pattern no longer holds), where other features can use them:
 * focus blocks start at `energy_pattern.peak_hour`.
 *
 * It also keeps watch (App\Jobs\AlfredRoundsJob runs these hourly, by the
 * user's local hour): procrastination, streaks about to break, and burnout.
 * Each sends an App\Services\AlfredService message at most once a day per subject.
 */
class AlfredIntelligence
{
    public const DAYS = 60;

    public const CATEGORIES = ['habit', 'mission', 'energy', 'pattern', 'finance'];

    /** Pattern types this service owns in system_intelligence. */
    private const PATTERNS = [
        'habit_vs_missions',
        'energy_by_day',
        'energy_pattern',
        'procrastination_by_day',
        'mood_vs_habits',
        'focus_vs_completion',
        'productive_day',
        'spending_trend',
    ];

    /** Fewer paired days than this and a correlation means nothing. */
    private const MIN_DAYS = 10;

    /** How strong a correlation must be to mention. */
    private const MIN_CORRELATION = 0.3;

    private const WEEKDAYS = [1 => 'Monday', 2 => 'Tuesday', 3 => 'Wednesday', 4 => 'Thursday', 5 => 'Friday', 6 => 'Saturday', 7 => 'Sunday'];

    /** No sessions started or missions finished by this local hour, and Alfred asks why. */
    public const NO_START_HOUR = 10;

    /** Missions postponed this often count as avoided. */
    public const AVOIDANCE_POSTPONEMENTS = 3;

    /** Days between burnout warnings. */
    private const BURNOUT_EVERY_DAYS = 3;

    public function __construct(
        private DailyStats $stats,
        private AlfredService $alfred,
        private ArsenalStreaks $streaks,
        private IntelSentiment $sentiment,
    ) {}

    /**
     * After 10am with nothing started (no focus session begun, no mission
     * completed): no_start, once a day, except in Rest mode. And
     * task_avoidance for each open mission postponed 3+ times, once a day
     * each, unless an unread warning about it is still waiting.
     */
    public function detectProcrastination(User $user): void
    {
        $now = CarbonImmutable::now($user->timezone);
        $since = $user->today()->utc();

        $startedSomething = $user->focusSessions()->where('start_time', '>=', $since)->exists()
            || $user->missions()->completed()->where('completed_at', '>=', $since)->exists();

        if ($now->hour >= self::NO_START_HOUR && ($user->current_mode ?? 'bruce') !== 'rest'
            && ! $startedSomething && ! $this->alfred->sentToday($user, 'no_start')) {
            $this->alfred->sendMessage($user, 'no_start', ['time' => $now->format('g:i A')]);
        }

        $avoided = $user->missions()->open()->where('times_postponed', '>=', self::AVOIDANCE_POSTPONEMENTS)->get();

        foreach ($avoided as $mission) {
            $waiting = $user->alfredMessages()->where('type', 'task_avoidance')->where('subject_id', $mission->id)
                ->unread()->active()->exists();

            if (! $waiting && ! $this->alfred->sentToday($user, 'task_avoidance', $mission->id)) {
                $this->alfred->sendMessage($user, 'task_avoidance', [
                    'title' => $mission->title,
                    'count' => $mission->times_postponed,
                    'mission_id' => $mission->id,
                ]);
            }
        }
    }

    /**
     * streak_danger for each habit due today, not done, whose streak (over 3)
     * missing today would end (grace counted). Once a day per habit.
     */
    public function detectStreakDanger(User $user): void
    {
        $today = $user->today();
        $habits = $user->arsenal()->where('active', true)->get();
        $logs = $this->streaks->logsFor($habits, $today);

        foreach ($habits as $habit) {
            $present = $this->streaks->present($habit, $logs->get($habit->id, collect()), $user);

            if ($present['streak_at_risk'] && ! $this->alfred->sentToday($user, 'streak_danger', $habit->id)) {
                $this->alfred->sendMessage($user, 'streak_danger', ['count' => $present['current_streak'], 'habit_id' => $habit->id]);
            }
        }
    }

    /**
     * burnout_detected when the last three Intel entries all read negative,
     * or the latest one talks of burnout. At most every 3 days, and not in Rest mode.
     */
    public function detectBurnout(User $user): void
    {
        if (($user->current_mode ?? 'bruce') === 'rest') {
            return;
        }

        $recent = $user->intel()->orderByDesc('date')->limit(3)->get();
        $latest = $recent->first();

        $burnedOut = ($recent->count() === 3 && $recent->every(fn ($entry) => $entry->sentiment_label === 'negative'))
            || ($latest !== null && $this->sentiment->soundsBurnedOut(implode(' ', [$latest->plainContent(), $latest->struggles])));

        $warnedLately = $user->alfredMessages()->where('type', 'burnout_detected')
            ->where('created_at', '>=', now()->subDays(self::BURNOUT_EVERY_DAYS))->exists();

        if ($burnedOut && ! $warnedLately) {
            $this->alfred->sendMessage($user, 'burnout_detected');
        }
    }

    /** Updates only `energy_pattern` (the focus-block hour) from the last 60 days. */
    public function learnEnergyPatterns(User $user): void
    {
        $today = $user->today();
        $pattern = $this->energyPeakHour($user, new Period('energy', $today->subDays(self::DAYS), $today->subDay()));

        $this->savePatterns($user, $pattern === null ? [] : [$pattern], only: ['energy_pattern']);
    }

    /**
     * The cached insights, generated when there are none.
     *
     * @return array{generated_at: string, days: int, insights: list<array<string, mixed>>}
     */
    public function cached(User $user): array
    {
        return Cache::get($this->cacheKey($user)) ?? $this->generateInsights($user);
    }

    /**
     * @return array{generated_at: string, days: int, insights: list<array<string, mixed>>}
     */
    public function generateInsights(User $user): array
    {
        $today = $user->today();
        // Whole days only: today isn't over.
        $period = new Period('insights', $today->subDays(self::DAYS), $today->subDay());

        $missions = $this->stats->missionsCompleted($user, $period);
        $focus = $this->stats->focusMinutes($user, $period);
        $timelines = $this->stats->habitTimelines($user, $period);
        $habits = $this->stats->habits($user, $period, $timelines);
        $intel = $this->stats->intel($user, $period);

        $found = array_values(array_filter([
            $this->habitVsMissions($timelines, $missions),
            $this->focusVsCompletion($focus, $missions),
            $this->moodVsHabits($intel, $habits),
            $this->energyByDay($intel),
            $this->energyPeakHour($user, $period),
            $this->procrastinationByDay($user, $period),
            $this->productiveDay($missions),
            $this->spendingTrend($user, $today),
        ]));

        $this->savePatterns($user, $found);

        $payload = [
            'generated_at' => now()->toIso8601String(),
            'days' => self::DAYS,
            'insights' => collect($found)
                ->sortByDesc('confidence')
                ->map(fn (array $insight) => [
                    'key' => $insight['key'],
                    'category' => $insight['category'],
                    'text' => $insight['text'],
                    'confidence' => $insight['confidence'],
                ])
                ->values()
                ->all(),
        ];

        Cache::put($this->cacheKey($user), $payload, now()->addDay());

        return $payload;
    }

    /**
     * Pearson's r, or null without enough pairs or with a constant series.
     *
     * @param  list<float|int>  $x
     * @param  list<float|int>  $y
     */
    public static function correlation(array $x, array $y): ?float
    {
        $n = count($x);
        if ($n < 3 || $n !== count($y)) {
            return null;
        }

        $meanX = array_sum($x) / $n;
        $meanY = array_sum($y) / $n;
        $covariance = $varianceX = $varianceY = 0.0;

        foreach ($x as $index => $value) {
            $dx = $value - $meanX;
            $dy = $y[$index] - $meanY;
            $covariance += $dx * $dy;
            $varianceX += $dx ** 2;
            $varianceY += $dy ** 2;
        }

        return $varianceX > 0 && $varianceY > 0 ? $covariance / sqrt($varianceX * $varianceY) : null;
    }

    private function cacheKey(User $user): string
    {
        return "alfred-insights:{$user->id}";
    }

    /**
     * For each daily habit: average missions completed on days it was done
     * against days it was due and missed. The habit with the biggest lift wins.
     *
     * @param  array<int, array{habit: Arsenal, days: array<string, array{due: bool, state: string}>}>  $timelines
     * @param  array<string, int>  $missions
     * @return array<string, mixed>|null
     */
    private function habitVsMissions(array $timelines, array $missions): ?array
    {
        $best = null;

        foreach ($timelines as ['habit' => $habit, 'days' => $days]) {
            $with = $without = [];
            foreach ($days as $date => $day) {
                if (! $day['due'] || ! in_array($day['state'], ['completed', 'missed'], true) || ! isset($missions[$date])) {
                    continue;
                }
                $day['state'] === 'completed' ? $with[] = $missions[$date] : $without[] = $missions[$date];
            }

            // A handful of missions either way proves nothing.
            if (count($with) < 5 || count($without) < 5 || array_sum($with) + array_sum($without) < self::MIN_DAYS) {
                continue;
            }

            $avgWith = array_sum($with) / count($with);
            $avgWithout = array_sum($without) / count($without);
            if ($avgWithout <= 0) {
                continue;
            }

            $lift = ($avgWith - $avgWithout) / $avgWithout * 100;
            if ($best === null || $lift > $best['lift']) {
                $best = ['habit' => $habit, 'lift' => $lift, 'with' => $avgWith, 'without' => $avgWithout, 'days' => count($with) + count($without)];
            }
        }

        if ($best === null || $best['lift'] <= 20) {
            return null;
        }

        $lift = (int) round($best['lift']);

        return [
            'key' => 'habit_vs_missions',
            'category' => 'habit',
            'text' => "You complete {$lift}% more missions on days you complete \u{201C}{$best['habit']->name}\u{201D}.",
            'confidence' => $this->confidence($best['days'] / self::DAYS),
            'data' => [
                'habit_id' => $best['habit']->id,
                'habit' => $best['habit']->name,
                'lift_percent' => $lift,
                'missions_with' => round($best['with'], 2),
                'missions_without' => round($best['without'], 2),
            ],
        ];
    }

    /**
     * @param  array<string, int>  $focus
     * @param  array<string, int>  $missions
     * @return array<string, mixed>|null
     */
    private function focusVsCompletion(array $focus, array $missions): ?array
    {
        $active = array_filter(array_keys($focus), fn (string $date) => $focus[$date] > 0 || $missions[$date] > 0);
        if (count($active) < self::MIN_DAYS) {
            return null;
        }

        $r = self::correlation(
            array_map(fn (string $date) => $focus[$date], $active),
            array_map(fn (string $date) => $missions[$date], $active),
        );
        $long = array_filter($active, fn (string $date) => $focus[$date] >= 60);
        $short = array_diff($active, $long);

        if ($r === null || $r < self::MIN_CORRELATION || count($long) < 3 || count($short) < 3) {
            return null;
        }

        $avg = fn (array $dates) => round(array_sum(array_map(fn (string $date) => $missions[$date], $dates)) / count($dates), 1);
        [$withFocus, $without] = [$avg($long), $avg($short)];

        return [
            'key' => 'focus_vs_completion',
            'category' => 'mission',
            'text' => "Focus pays, sir. On days with an hour or more of focus you complete {$withFocus} missions, against {$without} on the rest.",
            'confidence' => $this->confidence($r),
            'data' => ['correlation' => round($r, 2), 'missions_with_focus' => $withFocus, 'missions_without' => $without],
        ];
    }

    /**
     * @param  array<string, array{mood: int}>  $intel
     * @param  array<string, array{completed: int}>  $habits
     * @return array<string, mixed>|null
     */
    private function moodVsHabits(array $intel, array $habits): ?array
    {
        $dates = array_values(array_filter(array_keys($intel), fn (string $date) => isset($habits[$date])));
        if (count($dates) < self::MIN_DAYS) {
            return null;
        }

        $r = self::correlation(
            array_map(fn (string $date) => $habits[$date]['completed'], $dates),
            array_map(fn (string $date) => $intel[$date]['mood'], $dates),
        );

        if ($r === null || $r < self::MIN_CORRELATION) {
            return null;
        }

        return [
            'key' => 'mood_vs_habits',
            'category' => 'pattern',
            'text' => 'Your mood follows your habits, sir. The more of them you keep in a day, the better you write that you feel.',
            'confidence' => $this->confidence($r),
            'data' => ['correlation' => round($r, 2), 'days' => count($dates)],
        ];
    }

    /**
     * Average journal energy by weekday, when one day clearly leads.
     *
     * @param  array<string, array{energy: int|null}>  $intel
     * @return array<string, mixed>|null
     */
    private function energyByDay(array $intel): ?array
    {
        $byDay = collect($intel)
            ->filter(fn (array $day) => $day['energy'] !== null)
            ->map(fn (array $day, string $date) => ['weekday' => CarbonImmutable::parse($date)->dayOfWeekIso, 'energy' => $day['energy']])
            ->groupBy('weekday')
            ->filter(fn (Collection $days) => $days->count() >= 2)
            ->map(fn (Collection $days) => $days->avg('energy'));

        if ($byDay->count() < 3 || count(array_filter($intel, fn (array $day) => $day['energy'] !== null)) < 8) {
            return null;
        }

        $sorted = $byDay->sortDesc();
        $peakDay = $sorted->keys()->first();
        [$peak, $second] = $sorted->values()->take(2)->all();
        $overall = $byDay->avg();

        if ($peak - $overall < 1 || $peak - $second < 0.5) {
            return null;
        }

        $name = self::WEEKDAYS[$peakDay];

        return [
            'key' => 'energy_by_day',
            'category' => 'energy',
            'text' => sprintf('Your energy is highest on %ss (%.1f of 10, against %.1f on average). Consider scheduling hard work then.', $name, $peak, $overall),
            'confidence' => $this->confidence(($peak - $overall) / 3),
            'data' => [
                'peak_day' => $peakDay,
                'averages' => $byDay->map(fn (float $avg) => round($avg, 1))->sortKeys()->all(),
            ],
        ];
    }

    /**
     * The hour focus sessions start with the most energy (`energy_before`).
     * Saved as `energy_pattern`, which places focus blocks.
     *
     * @return array<string, mixed>|null
     */
    private function energyPeakHour(User $user, Period $period): ?array
    {
        $sessions = $user->focusSessions()
            ->whereBetween('start_time', [$period->startUtc(), $period->endUtc()])
            ->whereNotNull('energy_before')
            ->get(['start_time', 'energy_before']);

        if ($sessions->count() < 6) {
            return null;
        }

        $byHour = $sessions
            ->groupBy(fn (FocusSession $session) => $session->start_time->setTimezone($user->timezone)->hour)
            ->filter(fn (Collection $hour) => $hour->count() >= 2)
            ->map(fn (Collection $hour) => $hour->avg('energy_before'));

        if ($byHour->count() < 2) {
            return null;
        }

        $peakHour = $byHour->sortDesc()->keys()->first();
        $overall = $sessions->avg('energy_before');

        if ($byHour[$peakHour] - $overall < 1) {
            return null;
        }

        return [
            'key' => 'energy_pattern',
            'category' => 'energy',
            'text' => sprintf('You start focus sessions with the most energy around %02d:00, sir. I\'ll put focus blocks there.', $peakHour),
            // Enough sessions to trust it reaches 0.7, where focus blocks start using it.
            'confidence' => $this->confidence($sessions->count() / 20),
            'data' => ['peak_hour' => (int) $peakHour, 'sessions' => $sessions->count()],
        ];
    }

    /**
     * Postponements by the weekday missions are due. Postponing moves the due
     * date, so this reads where postponed missions ended up, not when they slipped.
     *
     * @return array<string, mixed>|null
     */
    private function procrastinationByDay(User $user, Period $period): ?array
    {
        $missions = $user->missions()
            ->whereDate('due_date', '>=', $period->start)
            ->whereDate('due_date', '<=', $period->end)
            ->get(['due_date', 'times_postponed']);

        if ($missions->count() < self::MIN_DAYS || $missions->sum('times_postponed') === 0) {
            return null;
        }

        $byDay = $missions
            ->groupBy(fn (Mission $mission) => $mission->due_date->dayOfWeekIso)
            ->filter(fn (Collection $day) => $day->count() >= 3)
            ->map(fn (Collection $day) => $day->avg('times_postponed'));

        if ($byDay->isEmpty()) {
            return null;
        }

        $worstDay = $byDay->sortDesc()->keys()->first();
        $worst = $byDay[$worstDay];
        $overall = $missions->avg('times_postponed');

        if ($worst < 1 || $worst < $overall * 1.5) {
            return null;
        }

        $name = self::WEEKDAYS[$worstDay];

        return [
            'key' => 'procrastination_by_day',
            'category' => 'mission',
            'text' => sprintf('Missions due on %ss get postponed most: %.1f times each, on average. Lighter %ss, perhaps?', $name, $worst, $name),
            'confidence' => $this->confidence($missions->count() / 30),
            'data' => [
                'worst_day' => $worstDay,
                'averages' => $byDay->map(fn (float $avg) => round($avg, 2))->sortKeys()->all(),
            ],
        ];
    }

    /**
     * @param  array<string, int>  $missions
     * @return array<string, mixed>|null
     */
    private function productiveDay(array $missions): ?array
    {
        $total = array_sum($missions);
        if ($total < self::MIN_DAYS) {
            return null;
        }

        $byDay = collect($missions)
            ->groupBy(fn (int $count, string $date) => CarbonImmutable::parse($date)->dayOfWeekIso, preserveKeys: true)
            ->map(fn (Collection $counts) => $counts->sum());
        $bestDay = $byDay->sortDesc()->keys()->first();
        $share = $byDay[$bestDay] / $total;

        // Even spread is 1/7 (14%); call it out at one and a half times that.
        if ($share < 1.5 / 7) {
            return null;
        }

        $percent = (int) round($share * 100);

        return [
            'key' => 'productive_day',
            'category' => 'pattern',
            'text' => self::WEEKDAYS[$bestDay]." is your most productive day: {$percent}% of your missions get done then.",
            'confidence' => $this->confidence($total / 40),
            'data' => ['best_day' => $bestDay, 'share_percent' => $percent, 'missions' => $total],
        ];
    }

    /**
     * Spending over the last 30 days against the 30 before, when it moved by 20% or more.
     * Money put into savings doesn't count as spending.
     *
     * @return array<string, mixed>|null
     */
    private function spendingTrend(User $user, CarbonImmutable $today): ?array
    {
        $recent = $this->expenses($user, $today->subDays(30), $today->subDay());
        $before = $this->expenses($user, $today->subDays(60), $today->subDays(31));

        if ($recent->count() < 5 || $before->count() < 5) {
            return null;
        }

        $now = (float) $recent->sum('amount');
        $then = (float) $before->sum('amount');
        $change = $then > 0 ? ($now - $then) / $then * 100 : 0;

        if (abs($change) < 20) {
            return null;
        }

        $percent = (int) round(abs($change));
        $byCategory = fn (Collection $items) => $items->groupBy('category')->map(fn (Collection $group) => (float) $group->sum('amount'));
        $recentByCategory = $byCategory($recent);
        $beforeByCategory = $byCategory($before);
        $leader = $recentByCategory->keys()->merge($beforeByCategory->keys())->unique()
            ->sortByDesc(fn (string $category) => ($recentByCategory[$category] ?? 0) - ($beforeByCategory[$category] ?? 0))
            ->first();

        return [
            'key' => 'spending_trend',
            'category' => 'finance',
            'text' => $change > 0
                ? "Spending is up {$percent}% on the previous 30 days, sir. {$leader} accounts for most of the rise."
                : "Spending is down {$percent}% on the previous 30 days. Well managed, sir.",
            'confidence' => $this->confidence(($recent->count() + $before->count()) / 40),
            'data' => ['change_percent' => (int) round($change), 'recent' => round($now, 2), 'previous' => round($then, 2), 'leading_category' => $leader],
        ];
    }

    /** @return Collection<int, resource> */
    private function expenses(User $user, CarbonImmutable $from, CarbonImmutable $to): Collection
    {
        return $user->resources()
            ->where('type', 'expense')
            ->where('category', '!=', Resource::SAVINGS_CATEGORY)
            ->whereDate('date', '>=', $from->toDateString())
            ->whereDate('date', '<=', $to->toDateString())
            ->get(['amount', 'category']);
    }

    /**
     * Replaces this service's patterns (or just the `only` types) with the ones found now.
     *
     * @param  list<array<string, mixed>>  $insights
     * @param  list<string>|null  $only
     */
    private function savePatterns(User $user, array $insights, ?array $only = null): void
    {
        $found = collect($insights)->keyBy('key');

        $user->systemIntelligence()
            ->whereIn('pattern_type', array_diff($only ?? self::PATTERNS, $found->keys()->all()))
            ->delete();

        foreach ($found as $type => $insight) {
            $user->systemIntelligence()->updateOrCreate(
                ['pattern_type' => $type],
                ['pattern_data' => $insight['data'], 'confidence' => $insight['confidence']],
            );
        }
    }

    /** 0.1 to 0.95, two decimals. */
    private function confidence(float $value): float
    {
        return round(max(0.1, min(0.95, abs($value))), 2);
    }
}
