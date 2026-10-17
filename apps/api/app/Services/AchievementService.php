<?php

namespace App\Services;

use App\Models\Achievement;
use App\Models\AlfredMessage;
use App\Models\ArsenalLog;
use App\Models\CaseMilestone;
use App\Models\FocusSession;
use App\Models\Mission;
use App\Models\MissionPostponement;
use App\Models\User;
use App\Support\Period;
use App\Support\Rewards;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

/**
 * Trophies: which ones a user has met, awarding them, and progress toward the rest.
 *
 * Definitions live in AchievementsSeeder. `criteria.type` names a stat
 * (see stat()) and `count`, `days`, `minutes`, `hours` or `level` is its
 * threshold. Features call checkAndAward() with the event that just
 * happened; only the stats that event can move are checked, plus levels.
 */
class AchievementService
{
    /** The stats each event can change. Unknown events check everything. */
    private const EVENT_TYPES = [
        'mission_complete' => [
            'missions_completed', 'missions_completed_without_postponing', 'missions_completed_early',
            'days_all_missions_completed', 'no_postpone_days', 'perfect_day',
            // Completing a mission completes its running focus session.
            'focus_sessions_completed', 'focus_minutes', 'focus_sessions_in_day', 'focus_hours_day',
        ],
        'habit_complete' => ['arsenal_logs_completed', 'arsenal_streak', 'arsenal_streak_rebuilt', 'days_all_arsenal_completed', 'perfect_day'],
        'streak_milestone' => ['arsenal_streak', 'arsenal_streak_rebuilt'],
        'focus_complete' => ['focus_sessions_completed', 'focus_minutes', 'focus_sessions_in_day', 'focus_hours_day'],
        'case_complete' => ['cases_completed'],
        'milestone_complete' => ['milestones_completed'],
        'journal_save' => ['intel_entries', 'intel_with_gratitude', 'intel_streak'],
        'resource_save' => ['resources_logged', 'days_with_resources', 'months_within_budget'],
        'alfred_action' => ['alfred_actions_taken', 'alfred_action_fast'],
        'daily_login' => ['login_streak', 'onboarding_completed'],
        // After a trophy's XP: only level trophies.
        'level' => [],
    ];

    /** Acting on Alfred within this many seconds counts as fast. */
    private const FAST_ACTION_SECONDS = 300;

    /** @var array<string, int|null> stats already computed during this check */
    private array $stats = [];

    public function __construct(
        private Finance $finance,
        private DailyStats $daily,
        private Xp $xp,
        private Rewards $rewards,
        private AlfredService $alfred,
    ) {}

    /**
     * Unearned trophies whose criteria are now met. Awards nothing.
     *
     * @param  array<string, mixed>  $data  Context from the caller; unused by the stats so far.
     * @return Collection<int, Achievement>
     */
    public function check(User $user, string $event, array $data = []): Collection
    {
        $types = isset(self::EVENT_TYPES[$event]) ? [...self::EVENT_TYPES[$event], 'level_reached'] : null;

        return Achievement::query()
            ->whereNotIn('id', $user->achievements()->pluck('achievements.id'))
            ->get()
            ->filter(fn (Achievement $achievement) => ($types === null || in_array($achievement->criteria['type'] ?? '', $types, true))
                && $this->isMet($user, $achievement->criteria))
            ->values();
    }

    /**
     * Gives the trophy, its XP and Alfred's word, and adds it to the
     * request's rewards. Returns the trophy as the unlock modal shows it.
     *
     * @return array<string, mixed>
     */
    public function award(User $user, Achievement $achievement): array
    {
        $user->achievements()->attach($achievement->id, ['earned_at' => now()]);
        $this->xp->award($user, $achievement->xp_reward, 'trophy', $achievement->name);
        unset($this->stats['level_reached']);

        $this->alfred->sendMessage($user, 'achievement_unlocked', [
            'achievement_name' => $achievement->name,
            'description' => rtrim($achievement->description, '.'),
        ]);

        $trophy = $this->present($achievement, now()->toIso8601String());
        $this->rewards->trophy($trophy);

        return $trophy;
    }

    /**
     * Checks and awards. A trophy's XP can raise the level, which can unlock
     * level trophies, so it checks again until nothing new is earned.
     *
     * @param  array<string, mixed>  $data
     * @return Collection<int, Achievement> the trophies earned
     */
    public function checkAndAward(User $user, string $event, array $data = []): Collection
    {
        $this->stats = [];
        $earned = collect();
        $new = $this->check($user, $event, $data);

        while ($new->isNotEmpty()) {
            $new->each(fn (Achievement $achievement) => $this->award($user, $achievement));
            $earned = $earned->merge($new);
            $new = $this->check($user, 'level', $data);
        }

        return $earned;
    }

    /**
     * Each trophy's progress: the stat's current value and the target, or
     * null for criteria types not tracked.
     *
     * @param  Collection<int, Achievement>  $achievements
     * @return array<int, array{current: int, target: int}|null> keyed by achievement id
     */
    public function progress(User $user, Collection $achievements): array
    {
        $this->stats = [];

        return $achievements->mapWithKeys(function (Achievement $achievement) use ($user) {
            $value = $this->value($user, $achievement->criteria);

            return [$achievement->id => $value === null ? null : [
                'current' => min($value, $this->threshold($achievement->criteria)),
                'target' => $this->threshold($achievement->criteria),
            ]];
        })->all();
    }

    /** @return array<string, mixed> */
    public function present(Achievement $achievement, ?string $earnedAt = null): array
    {
        return [
            'id' => $achievement->id,
            'key' => $achievement->key,
            'name' => $achievement->name,
            'description' => $achievement->description,
            'category' => $achievement->category,
            'icon' => $achievement->icon,
            'rarity' => $achievement->rarity,
            'xp_reward' => $achievement->xp_reward,
            'earned_at' => $earnedAt,
        ];
    }

    /** @param  array<string, mixed>  $criteria */
    public function threshold(array $criteria): int
    {
        return max(1, (int) ($criteria['count'] ?? $criteria['days'] ?? $criteria['minutes'] ?? $criteria['hours'] ?? $criteria['level'] ?? 1));
    }

    /** @param  array<string, mixed>  $criteria */
    private function isMet(User $user, array $criteria): bool
    {
        $value = $this->value($user, $criteria);

        return $value !== null && $value >= $this->threshold($criteria);
    }

    /** @param  array<string, mixed>  $criteria */
    private function value(User $user, array $criteria): ?int
    {
        $type = $criteria['type'] ?? '';
        $key = $type.':'.($criteria['priority'] ?? '');

        return $this->stats[$key] ??= $this->stat($user, $type, $criteria);
    }

    /**
     * The user's current value for a criteria type, or null for types not tracked.
     *
     * @param  array<string, mixed>  $criteria
     */
    private function stat(User $user, string $type, array $criteria): ?int
    {
        return match ($type) {
            'missions_completed' => $user->missions()->completed()
                ->when($criteria['priority'] ?? null, fn ($query, $priority) => $query->where('priority', $priority))
                ->count(),
            'missions_completed_without_postponing' => $user->missions()->completed()->where('times_postponed', 0)->count(),
            'missions_completed_early' => $user->missions()->completed()->get(['due_date', 'completed_at'])
                ->filter(fn (Mission $mission) => $this->localDate($mission->completed_at, $user) < $mission->due_date->toDateString())
                ->count(),
            'days_all_missions_completed' => count($this->missionDaysDone($user)),
            'no_postpone_days' => $this->noPostponeRun($user),
            'perfect_day' => count(array_intersect($this->missionDaysDone($user), $this->habitDaysDone($user))),
            'cases_completed' => $user->cases()->completed()->count(),
            'milestones_completed' => CaseMilestone::completed()
                ->whereHas('case', fn ($query) => $query->where('user_id', $user->id))
                ->count(),
            'focus_sessions_completed' => $user->focusSessions()->completed()->count(),
            'focus_minutes' => (int) $user->focusSessions()->whereNotNull('end_time')->sum('duration_minutes'),
            'focus_sessions_in_day' => (int) $this->focusByDay($user)->map->count()->max(),
            'focus_hours_day' => intdiv((int) $this->focusByDay($user)->map(fn (Collection $day) => $day->sum('duration_minutes'))->max(), 60),
            'arsenal_logs_completed' => ArsenalLog::where('user_id', $user->id)->where('completed', true)->count(),
            'arsenal_streak' => (int) $user->arsenal()->max('best_streak'),
            'arsenal_streak_rebuilt' => $this->rebuiltStreak($user),
            'days_all_arsenal_completed' => count($this->habitDaysDone($user)),
            'intel_entries' => $user->intel()->count(),
            'intel_with_gratitude' => $user->intel()->whereNotNull('gratitude')->where('gratitude', '!=', '')->count(),
            'intel_streak' => $this->longestRun($user->intel()->orderBy('date')->pluck('date')),
            'resources_logged' => $user->resources()->count(),
            'days_with_resources' => $user->resources()->distinct()->count('date'),
            'months_within_budget' => $this->finance->monthsWithinBudget($user),
            'alfred_actions_taken' => $user->alfredMessages()->where('action_taken', true)->count(),
            'alfred_action_fast' => $user->alfredMessages()->whereNotNull('acted_at')->get(['created_at', 'acted_at'])
                ->filter(fn (AlfredMessage $message) => $message->created_at->diffInSeconds($message->acted_at) <= self::FAST_ACTION_SECONDS)
                ->count(),
            'login_streak' => $this->longestRun($user->activityDays()->orderBy('date')->pluck('date')),
            'onboarding_completed' => (int) $user->onboarding_completed,
            'level_reached' => $user->current_level,
            default => null,
        };
    }

    private function localDate(CarbonInterface $instant, User $user): string
    {
        return $instant->copy()->setTimezone($user->timezone)->toDateString();
    }

    /** @return Collection<string, Collection<int, FocusSession>> completed sessions by local day */
    private function focusByDay(User $user): Collection
    {
        return $user->focusSessions()->completed()->get(['start_time', 'duration_minutes'])
            ->groupBy(fn (FocusSession $session) => $this->localDate($session->start_time, $user));
    }

    /**
     * Days (up to today) with missions due, every one of them completed by
     * the end of that day. Abandoned missions don't count.
     *
     * @return list<string>
     */
    private function missionDaysDone(User $user): array
    {
        $today = $user->today()->toDateString();

        return $user->missions()->where('status', '!=', 'abandoned')->whereDate('due_date', '<=', $today)
            ->get(['due_date', 'status', 'completed_at'])
            ->groupBy(fn (Mission $mission) => $mission->due_date->toDateString())
            ->filter(fn (Collection $missions, string $date) => $missions->every(
                fn (Mission $mission) => $mission->status === 'completed' && $this->localDate($mission->completed_at, $user) <= $date,
            ))
            ->keys()
            ->all();
    }

    /**
     * Days in the streak window where every due habit was completed.
     *
     * @return list<string>
     */
    private function habitDaysDone(User $user): array
    {
        $today = $user->today();
        $period = new Period('trophies', $today->subDays(ArsenalStreaks::WINDOW_DAYS), $today);

        return collect($this->daily->habits($user, $period))
            ->filter(fn (array $day) => $day['due'] > 0 && $day['done'] === $day['due'])
            ->keys()
            ->all();
    }

    /** The longest run of days, each with a mission completed and none postponed. */
    private function noPostponeRun(User $user): int
    {
        $postponed = MissionPostponement::where('user_id', $user->id)->get(['created_at'])
            ->map(fn (MissionPostponement $postponement) => $this->localDate($postponement->created_at, $user))
            ->flip();

        $days = $user->missions()->completed()->get(['completed_at'])
            ->map(fn (Mission $mission) => $this->localDate($mission->completed_at, $user))
            ->unique()
            ->reject(fn (string $date) => $postponed->has($date))
            ->sort()
            ->map(fn (string $date) => CarbonImmutable::parse($date));

        return $this->longestRun($days->values());
    }

    /**
     * The longest daily run on any habit that came after an earlier run broke.
     * Only due days count; skips neither break nor extend a run.
     */
    private function rebuiltStreak(User $user): int
    {
        $today = $user->today();
        $period = new Period('trophies', $today->subDays(ArsenalStreaks::WINDOW_DAYS), $today);
        $best = 0;

        foreach ($this->daily->habitTimelines($user, $period) as ['days' => $days]) {
            $run = 0;
            $broken = false;

            foreach ($days as $day) {
                if (! $day['due'] || $day['state'] === 'skipped' || $day['state'] === 'pending') {
                    continue;
                }

                if ($day['state'] === 'completed') {
                    $run++;
                    if ($broken) {
                        $best = max($best, $run);
                    }
                } else {
                    $broken = $broken || $run > 0;
                    $run = 0;
                }
            }
        }

        return $best;
    }

    /**
     * The longest run of consecutive days among these dates (sorted, unique).
     *
     * @param  Collection<int, CarbonInterface>  $dates
     */
    private function longestRun(Collection $dates): int
    {
        $best = $run = 0;
        $previous = null;

        foreach ($dates as $date) {
            $run = $previous !== null && (int) $previous->diffInDays($date) === 1 ? $run + 1 : 1;
            $best = max($best, $run);
            $previous = $date;
        }

        return $best;
    }
}
