<?php

namespace App\Http\Controllers;

use App\Http\Resources\MissionResource;
use App\Models\Arsenal;
use App\Models\User;
use App\Services\ArsenalStreaks;
use App\Support\BatmanQuotes;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * HQ: everything the dashboard needs in one call. "Today" is always the
 * user's own day, in their timezone.
 */
class DashboardController extends Controller
{
    public function __construct(private ArsenalStreaks $streaks) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $today = $user->today();
        $arsenal = $this->arsenal($user, $today);
        $todaysArsenal = $arsenal->where('due_today', true)->map(fn (array $habit) => collect($habit)->except('due_today')->all())->values();

        return $this->success([
            'morning_brief' => [
                'greeting' => $this->greeting($user),
                'mission' => $this->briefMission($user, $today),
                'habits' => $todaysArsenal->where('completed', false)->take(3)->values(),
                'quote' => BatmanQuotes::forDay($user->id, $today->toDateString()),
            ],
            'stats' => [
                'mission_success' => $this->missionSuccess($user, $today),
                'longest_streak' => $this->longestStreak($arsenal),
                'focus_time' => $this->focusTime($user, $today),
            ],
            'todays_missions' => MissionResource::collection(
                $user->missions()->open()
                    ->whereDate('due_date', $today)
                    ->orderByPriority()
                    ->orderByDesc('times_postponed')
                    ->limit(5)
                    ->get()
            ),
            'todays_arsenal' => $todaysArsenal,
        ]);
    }

    private function greeting(User $user): string
    {
        $name = Str::before(trim($user->name), ' ') ?: 'sir';
        $hour = now($user->timezone)->hour;

        return match (true) {
            $hour >= 5 && $hour < 12 => "Good morning, {$name}.",
            $hour >= 12 && $hour < 17 => "Good afternoon, {$name}.",
            $hour >= 17 && $hour < 22 => "Good evening, {$name}.",
            default => "Working late, {$name}?",
        };
    }

    /** The one mission to start the day with: due today or overdue, most urgent and most avoided. */
    private function briefMission(User $user, CarbonImmutable $today): ?MissionResource
    {
        $mission = $user->missions()->open()
            ->whereDate('due_date', '<=', $today)
            ->orderByPriority()
            ->orderByDesc('times_postponed')
            ->orderBy('due_date')
            ->first();

        return $mission ? new MissionResource($mission) : null;
    }

    /**
     * Every active habit with today's state. `due_today` marks the ones on today's list.
     *
     * @return Collection<int, array<string, mixed>>
     */
    private function arsenal(User $user, CarbonImmutable $today): Collection
    {
        $habits = $user->arsenal()->active()->orderBy('created_at')->orderBy('id')->get();
        $logs = $this->streaks->logsFor($habits, $today);

        return $habits->map(function (Arsenal $habit) use ($logs, $user) {
            $habitLogs = $logs->get($habit->id, collect());

            $habit = $this->streaks->present($habit, $habitLogs, $user);

            return [...$habit, 'due_today' => $habit['active_today']];
        });
    }

    /** @return array<string, int> */
    private function missionSuccess(User $user, CarbonImmutable $today): array
    {
        [$completed, $total] = $this->missionCounts($user, $today);
        [$completedYesterday, $totalYesterday] = $this->missionCounts($user, $today->subDay());

        return [
            'completed_today' => $completed,
            'total_due_today' => $total,
            'percentage' => $this->percentage($completed, $total),
            // For the trend arrow.
            'yesterday_percentage' => $this->percentage($completedYesterday, $totalYesterday),
        ];
    }

    /** @return array{int, int} completed and total missions due that day, abandoned ones excluded */
    private function missionCounts(User $user, CarbonImmutable $day): array
    {
        $missions = $user->missions()
            ->whereDate('due_date', $day)
            ->where('status', '!=', 'abandoned')
            ->pluck('status');

        return [$missions->filter(fn (string $status) => $status === 'completed')->count(), $missions->count()];
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $arsenal
     * @return array{habit_name: string, streak_count: int, streak_unit: string}|null
     */
    private function longestStreak(Collection $arsenal): ?array
    {
        $habit = $arsenal->sortByDesc('current_streak')->first();

        return $habit ? [
            'habit_name' => $habit['name'],
            'streak_count' => $habit['current_streak'],
            'streak_unit' => $habit['streak_unit'],
        ] : null;
    }

    /** @return array<string, int> */
    private function focusTime(User $user, CarbonImmutable $today): array
    {
        $minutes = (int) $user->focusSessions()
            ->completed()
            ->whereBetween('start_time', [$today->utc(), $today->endOfDay()->utc()])
            ->sum('duration_minutes');
        $goal = $user->focusGoalMinutes();

        return [
            'minutes_today' => $minutes,
            'goal_minutes' => $goal,
            'percentage' => $this->percentage($minutes, $goal),
        ];
    }

    private function percentage(int $part, int $whole): int
    {
        return $whole > 0 ? (int) round($part / $whole * 100) : 0;
    }
}
