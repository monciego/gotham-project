<?php

namespace App\Http\Controllers;

use App\Http\Resources\EarnedTrophyResource;
use App\Http\Resources\FocusSessionResource;
use App\Models\FocusSession;
use App\Models\User;
use App\Services\AchievementService;
use App\Services\FocusSessions;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Timed work sessions, optionally on a mission. The timer runs in the
 * browser; the API records when a session started and how it ended.
 */
class FocusSessionController extends Controller
{
    public function __construct(
        private AchievementService $achievements,
        private FocusSessions $focus,
    ) {}

    /** `from` / `to` are days (Y-m-d) in the user's timezone, both inclusive. */
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'from' => ['sometimes', 'date_format:Y-m-d'],
            'to' => ['sometimes', 'date_format:Y-m-d', 'after_or_equal:from'],
            'mission_id' => ['sometimes', 'integer'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $user = $request->user();
        $sessions = $user->focusSessions()
            ->when($filters['mission_id'] ?? null, fn (Builder $query, int $id) => $query->where('mission_id', $id))
            ->when($filters['from'] ?? null, fn (Builder $query, string $from) => $query->where('start_time', '>=', $this->dayStart($user, $from)))
            ->when($filters['to'] ?? null, fn (Builder $query, string $to) => $query->where('start_time', '<', $this->dayStart($user, $to)->addDay()));

        $totalMinutes = (int) (clone $sessions)->whereNotNull('end_time')->sum('duration_minutes');
        $page = $sessions->with('mission:id,title,status')
            ->latest('start_time')
            ->orderByDesc('id')
            ->paginate($filters['per_page'] ?? 20);

        return $this->success([
            'items' => FocusSessionResource::collection($page->items()),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
                'total_minutes' => $totalMinutes,
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'mission_id' => ['sometimes', 'nullable', 'integer'],
            'duration_minutes' => ['sometimes', 'integer', 'min:5', 'max:180'],
            'energy_before' => ['sometimes', 'nullable', 'integer', 'between:1,10'],
        ]);

        $user = $request->user();
        $mission = null;

        if (isset($validated['mission_id'])) {
            $mission = $user->missions()->find($validated['mission_id']);

            if (! $mission) {
                throw ValidationException::withMessages(['mission_id' => "I can't find that mission, sir."]);
            }
            if (! $mission->isOpen()) {
                throw ValidationException::withMessages(['mission_id' => "This mission is already {$mission->status}."]);
            }
        }

        $session = $this->focus->start(
            $user,
            $mission,
            $validated['duration_minutes'] ?? 25,
            $validated['energy_before'] ?? null,
        );

        return $this->success(
            new FocusSessionResource($session->load('mission:id,title,status')),
            'Session started. I shall keep the time, sir.',
            201,
        );
    }

    public function show(Request $request, int $session): JsonResponse
    {
        return $this->success(new FocusSessionResource($this->find($request->user(), $session)));
    }

    public function complete(Request $request, int $session): JsonResponse
    {
        $validated = $request->validate(['distractions' => ['sometimes', 'integer', 'min:0', 'max:999']]);

        $user = $request->user();
        $model = $this->running($user, $session);
        $levelBefore = $user->current_level;

        $model->fill(['distractions' => $validated['distractions'] ?? $model->distractions]);
        $xp = $this->focus->complete($user, $model);
        $trophies = $this->achievements->checkAndAward($user, 'focus_complete');
        $user->refresh();

        return $this->success([
            'session' => new FocusSessionResource($model->load('mission:id,title,status')),
            'xp_awarded' => $xp,
            'total_xp' => $user->total_xp,
            'current_level' => $user->current_level,
            'level_up' => $user->current_level > $levelBefore,
            'achievements' => EarnedTrophyResource::collection($trophies->values()),
        ], "Well done, sir. {$model->duration_minutes} minutes of focused work.");
    }

    public function abandon(Request $request, int $session): JsonResponse
    {
        $validated = $request->validate(['distractions' => ['sometimes', 'integer', 'min:0', 'max:999']]);

        $model = $this->running($request->user(), $session);
        $model->fill(['distractions' => $validated['distractions'] ?? $model->distractions]);
        $model->finish(completed: false);

        return $this->success(new FocusSessionResource($model), 'Session ended early. It still counts, sir.');
    }

    public function updateEnergy(Request $request, int $session): JsonResponse
    {
        $validated = $request->validate(['energy_after' => ['required', 'integer', 'between:1,10']]);

        $model = $this->find($request->user(), $session);
        if ($model->isRunning()) {
            throw ValidationException::withMessages(['session' => 'Rate your energy once the session ends, sir.']);
        }

        $model->update($validated);

        return $this->success(new FocusSessionResource($model), 'Noted, sir.');
    }

    private function find(User $user, int $id): FocusSession
    {
        return $user->focusSessions()->with('mission:id,title,status')->findOrFail($id);
    }

    private function running(User $user, int $id): FocusSession
    {
        $session = $this->find($user, $id);

        if (! $session->isRunning()) {
            throw ValidationException::withMessages(['session' => 'This session has already ended.']);
        }

        return $session;
    }

    private function dayStart(User $user, string $day): CarbonImmutable
    {
        return CarbonImmutable::parse($day, $user->today()->getTimezone())->startOfDay()->utc();
    }
}
