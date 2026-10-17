<?php

namespace App\Services;

use App\Models\Achievement;
use App\Models\ArsenalLog;
use App\Models\CaseMilestone;
use App\Models\Mission;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * Awards trophies whose criteria (see AchievementsSeeder) the user now meets.
 * Each trophy grants its XP and a message from Alfred.
 */
class Achievements
{
    /** @var array<string, int> stats already computed during this check */
    private array $stats = [];

    /**
     * @return Collection<int, Achievement> trophies earned by this check
     */
    public function check(User $user): Collection
    {
        $this->stats = [];
        $earned = collect();

        // Trophy XP can raise the level, which can unlock level trophies, so repeat until nothing new.
        do {
            $owned = $user->achievements()->pluck('achievements.id')->merge($earned->pluck('id'));
            $new = Achievement::whereNotIn('id', $owned)->get()
                ->filter(fn (Achievement $achievement) => $this->isMet($user, $achievement->criteria));

            foreach ($new as $achievement) {
                $user->achievements()->attach($achievement->id, ['earned_at' => now()]);
                $user->gainXp($achievement->xp_reward);
                unset($this->stats['level_reached']);

                $user->alfredMessages()->create([
                    'priority' => 'low',
                    'mood' => 'proud',
                    'title' => "Trophy earned: {$achievement->name}",
                    'message' => "{$achievement->description} +{$achievement->xp_reward} XP.",
                    'actions' => [['label' => 'View trophies', 'href' => '/trophies']],
                ]);

                $earned->push($achievement);
            }
        } while ($new->isNotEmpty());

        return $earned;
    }

    /** @param  array<string, mixed>  $criteria */
    private function isMet(User $user, array $criteria): bool
    {
        $type = $criteria['type'] ?? '';
        $threshold = (int) ($criteria['count'] ?? $criteria['days'] ?? $criteria['minutes'] ?? $criteria['level'] ?? 1);
        $key = $type.':'.($criteria['priority'] ?? '');

        $value = $this->stats[$key] ??= $this->stat($user, $type, $criteria);

        return $value !== null && $value >= $threshold;
    }

    /**
     * The user's current value for a criteria type, or null for types not tracked yet.
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
                ->filter(fn (Mission $mission) => $mission->completed_at
                    ->setTimezone($user->timezone)->toDateString() < $mission->due_date->toDateString())
                ->count(),
            'cases_completed' => $user->cases()->completed()->count(),
            'milestones_completed' => CaseMilestone::completed()
                ->whereHas('case', fn ($query) => $query->where('user_id', $user->id))
                ->count(),
            'focus_sessions_completed' => $user->focusSessions()->completed()->count(),
            'focus_minutes' => (int) $user->focusSessions()->whereNotNull('end_time')->sum('duration_minutes'),
            'arsenal_logs_completed' => ArsenalLog::where('user_id', $user->id)->where('completed', true)->count(),
            'arsenal_streak' => (int) $user->arsenal()->max('best_streak'),
            'intel_entries' => $user->intel()->count(),
            'resources_logged' => $user->resources()->count(),
            'alfred_actions_taken' => $user->alfredMessages()->where('action_taken', true)->count(),
            'onboarding_completed' => (int) $user->onboarding_completed,
            'level_reached' => $user->current_level,
            default => null,
        };
    }
}
