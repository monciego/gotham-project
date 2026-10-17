<?php

namespace App\Http\Controllers;

use App\Models\Achievement;
use App\Models\User;
use App\Models\XpEvent;
use App\Services\AchievementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class TrophyController extends Controller
{
    private const RARITY_ORDER = ['common' => 0, 'rare' => 1, 'epic' => 2, 'legendary' => 3];

    public function __construct(private AchievementService $achievements) {}

    /** Every trophy with whether it's earned and progress toward it, plus the user's level. */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $all = Achievement::query()->orderBy('category')->orderBy('id')->get()
            ->sortBy(fn (Achievement $achievement) => [$achievement->category, self::RARITY_ORDER[$achievement->rarity] ?? 9, $achievement->id])
            ->values();
        $earned = $this->earned($user);
        $progress = $this->achievements->progress($user, $all);

        return $this->success([
            'level' => $this->level($user),
            'summary' => [
                'earned' => $earned->count(),
                'total' => $all->count(),
            ],
            'trophies' => $all->map(fn (Achievement $achievement) => $this->trophy($achievement, $earned, $progress)),
        ]);
    }

    public function show(Request $request, int $trophy): JsonResponse
    {
        $user = $request->user();
        $achievement = Achievement::findOrFail($trophy);

        return $this->success($this->trophy(
            $achievement,
            $this->earned($user),
            $this->achievements->progress($user, collect([$achievement])),
        ));
    }

    /** XP ranking. Only the user for now; ready for when there is someone to compare with. */
    public function leaderboard(Request $request): JsonResponse
    {
        $user = $request->user();

        return $this->success([[
            'rank' => 1,
            'name' => $user->name,
            'current_level' => $user->current_level,
            'total_xp' => $user->total_xp,
            'is_you' => true,
        ]]);
    }

    /** Recent XP changes, newest first (`limit`, default 30, at most 100). */
    public function xpHistory(Request $request): JsonResponse
    {
        $validated = $request->validate(['limit' => ['sometimes', 'integer', 'min:1', 'max:100']]);
        $user = $request->user();

        return $this->success([
            'level' => $this->level($user),
            'events' => $user->xpEvents()->latest('created_at')->latest('id')->limit($validated['limit'] ?? 30)->get()
                ->map(fn (XpEvent $event) => [
                    'id' => $event->id,
                    'amount' => $event->amount,
                    'reason' => $event->reason,
                    'label' => $event->label,
                    'total_after' => $event->total_after,
                    'level_before' => $event->level_before,
                    'level_after' => $event->level_after,
                    'created_at' => $event->created_at,
                ]),
        ]);
    }

    /** @return Collection<int, string> earned_at (ISO) keyed by achievement id */
    private function earned(User $user): Collection
    {
        return $user->achievements()->get()
            ->mapWithKeys(fn (Achievement $achievement) => [$achievement->id => $achievement->pivot->earned_at?->toIso8601String()]);
    }

    /**
     * @param  Collection<int, string>  $earned
     * @param  array<int, array{current: int, target: int}|null>  $progress
     * @return array<string, mixed>
     */
    private function trophy(Achievement $achievement, Collection $earned, array $progress): array
    {
        $isEarned = $earned->has($achievement->id);

        return [
            ...$this->achievements->present($achievement, $earned->get($achievement->id)),
            'earned' => $isEarned,
            // Earned trophies show as complete even if the stat later fell (an undo, a deleted entry).
            'progress' => $isEarned && isset($progress[$achievement->id])
                ? ['current' => $progress[$achievement->id]['target'], 'target' => $progress[$achievement->id]['target']]
                : $progress[$achievement->id] ?? null,
        ];
    }

    /** @return array{current_level: int, total_xp: int, level_start_xp: int, next_level_xp: int, xp_into_level: int, xp_per_level: int} */
    private function level(User $user): array
    {
        $start = ($user->current_level - 1) * User::XP_PER_LEVEL;

        return [
            'current_level' => $user->current_level,
            'total_xp' => $user->total_xp,
            'level_start_xp' => $start,
            'next_level_xp' => $start + User::XP_PER_LEVEL,
            'xp_into_level' => $user->total_xp - $start,
            'xp_per_level' => User::XP_PER_LEVEL,
        ];
    }
}
