<?php

namespace App\Http\Controllers;

use App\Http\Requests\MissionRequest;
use App\Http\Resources\MissionResource;
use App\Models\Achievement;
use App\Models\FocusSession;
use App\Models\Mission;
use App\Models\User;
use App\Services\Achievements;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class MissionController extends Controller
{
    /** Alfred steps in when a mission has been pushed back this many times. */
    private const POSTPONE_WARNING = 3;

    public function __construct(private Achievements $achievements) {}

    /**
     * `view`: today | upcoming | overdue | all. Upcoming and overdue only list open
     * missions; the others hide abandoned ones. An explicit `status` overrides both.
     */
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'view' => ['sometimes', Rule::in(['today', 'upcoming', 'overdue', 'all'])],
            'status' => ['sometimes', Rule::in(['not_started', 'in_progress', 'completed', 'abandoned', 'open'])],
            'priority' => ['sometimes', Rule::in(['critical', 'high', 'medium', 'low'])],
            'due_date' => ['sometimes', 'date_format:Y-m-d'],
            'case_id' => ['sometimes', 'integer'],
            'search' => ['sometimes', 'nullable', 'string', 'max:100'],
            'sort' => ['sometimes', Rule::in(['due_date', 'priority', 'times_postponed', 'created_at'])],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $user = $request->user();
        $today = $user->today();
        $view = $filters['view'] ?? 'all';
        $status = $filters['status'] ?? null;

        $missions = $user->missions()
            ->with('case:id,name,color')
            ->withCount(['subtasks', 'subtasks as subtasks_completed_count' => fn (Builder $query) => $query->where('completed', true)])
            ->when($view === 'today', fn (Builder $query) => $query->whereDate('due_date', $today))
            ->when($view === 'upcoming', fn (Builder $query) => $query->whereDate('due_date', '>', $today))
            ->when($view === 'overdue', fn (Builder $query) => $query->whereDate('due_date', '<', $today))
            ->when(
                $status,
                fn (Builder $query) => $status === 'open' ? $query->open() : $query->where('status', $status),
                fn (Builder $query) => in_array($view, ['upcoming', 'overdue'], true)
                    ? $query->open()
                    : $query->where('status', '!=', 'abandoned'),
            )
            ->when($filters['priority'] ?? null, fn (Builder $query, string $priority) => $query->where('priority', $priority))
            ->when($filters['due_date'] ?? null, fn (Builder $query, string $date) => $query->whereDate('due_date', $date))
            ->when($filters['case_id'] ?? null, fn (Builder $query, int $caseId) => $query->where('case_id', $caseId))
            ->when($filters['search'] ?? null, fn (Builder $query, string $search) => $query->where(
                fn (Builder $query) => $query->whereLike('title', "%{$search}%")->orWhereLike('description', "%{$search}%")
            ));

        match ($filters['sort'] ?? 'due_date') {
            'priority' => $missions->orderByPriority()->orderBy('due_date'),
            'times_postponed' => $missions->orderByDesc('times_postponed')->orderByPriority(),
            'created_at' => $missions->latest(),
            default => $missions->orderBy('due_date')->orderByPriority(),
        };

        $page = $missions->orderBy('id')->paginate($filters['per_page'] ?? 20);

        return $this->success([
            'items' => MissionResource::collection($page->items()),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
            ],
        ]);
    }

    public function store(MissionRequest $request): JsonResponse
    {
        $mission = $request->user()->missions()->create($request->validated());
        $mission->case?->recalculateProgress();

        return $this->success(new MissionResource($mission->refresh()), 'Mission created.', 201);
    }

    public function show(Request $request, int $mission): JsonResponse
    {
        return $this->success(new MissionResource($this->detailed($request->user(), $mission)));
    }

    public function update(MissionRequest $request, int $mission): JsonResponse
    {
        $user = $request->user();
        $model = $this->find($user, $mission);
        $data = $request->validated();
        $oldCase = $model->case;

        // Pushing the due date later counts as postponing it.
        if (isset($data['due_date']) && $data['due_date'] > $model->due_date->toDateString()) {
            $data['times_postponed'] = $model->times_postponed + 1;
        }

        // Reopening a finished mission. Its XP was already granted and isn't granted again.
        if (isset($data['status']) && ! $model->isOpen()) {
            $data['completed_at'] = null;
            $data['abandon_reason'] = null;
        }

        $model->update($data);
        $model->unsetRelation('case');

        if ($model->wasChanged('times_postponed') && $model->times_postponed === self::POSTPONE_WARNING) {
            $user->alfredMessages()->create([
                'priority' => 'high',
                'mood' => 'concerned',
                'title' => 'Postponed three times, sir.',
                'message' => "\"{$model->title}\" has slipped three times now. Shall we break it into smaller steps?",
                'actions' => [['label' => 'Break it down', 'href' => "/missions/{$model->id}?breakdown=1"]],
                'requires_action' => true,
            ]);
        }

        if ($model->wasChanged(['case_id', 'status'])) {
            $model->case?->recalculateProgress();
            if ($oldCase?->isNot($model->case)) {
                $oldCase->recalculateProgress();
            }
        }

        return $this->success(new MissionResource($this->detailed($user, $mission)), 'Mission updated.');
    }

    public function destroy(Request $request, int $mission): JsonResponse
    {
        $model = $this->find($request->user(), $mission);
        $model->delete();
        $model->case?->recalculateProgress();

        return $this->success(message: 'Mission deleted.');
    }

    public function complete(Request $request, int $mission): JsonResponse
    {
        $user = $request->user();
        $model = $this->find($user, $mission);
        $levelBefore = $user->current_level;
        $xp = 0;
        $trophies = collect();

        if ($model->status !== 'completed') {
            DB::transaction(function () use ($user, $model, &$xp, &$trophies) {
                $model->update(['status' => 'completed', 'completed_at' => now(), 'abandon_reason' => null]);
                $this->endRunningSession($model);

                if ($model->xp_awarded === 0) {
                    $xp = $model->xpReward();
                    // Not mass-assignable, so requests can't set it.
                    $model->forceFill(['xp_awarded' => $xp])->save();
                    $user->gainXp($xp);
                }

                $model->case?->recalculateProgress();
                $trophies = $this->achievements->check($user);
            });
        }

        $user->refresh();

        return $this->success([
            'mission' => new MissionResource($this->detailed($user, $mission)),
            'xp_awarded' => $xp,
            'total_xp' => $user->total_xp,
            'current_level' => $user->current_level,
            'level_up' => $user->current_level > $levelBefore,
            'achievements' => $trophies->map(fn (Achievement $achievement) => [
                'key' => $achievement->key,
                'name' => $achievement->name,
                'description' => $achievement->description,
                'rarity' => $achievement->rarity,
                'xp_reward' => $achievement->xp_reward,
            ])->values(),
        ], 'Well done, sir. Gotham is a little safer tonight.');
    }

    public function abandon(Request $request, int $mission): JsonResponse
    {
        $validated = $request->validate(['reason' => ['required', 'string', 'min:3', 'max:1000']]);
        $model = $this->find($request->user(), $mission);
        $this->ensureOpen($model);

        $model->update(['status' => 'abandoned', 'abandon_reason' => $validated['reason']]);
        $this->endRunningSession($model);
        $model->case?->recalculateProgress();

        return $this->success(new MissionResource($this->detailed($request->user(), $mission)), 'Mission abandoned.');
    }

    public function start(Request $request, int $mission): JsonResponse
    {
        $model = $this->find($request->user(), $mission);
        $this->ensureOpen($model);

        $model->update(['status' => 'in_progress']);

        return $this->success(new MissionResource($this->detailed($request->user(), $mission)), 'Mission started.');
    }

    private function find(User $user, int $id): Mission
    {
        return $user->missions()->findOrFail($id);
    }

    private function detailed(User $user, int $id): Mission
    {
        return $user->missions()->with([
            'case:id,name,color',
            'subtasks',
            'focusSessions' => fn (HasMany $query) => $query->latest('start_time'),
            'dependencies',
            'dependents',
        ])->findOrFail($id);
    }

    /** A closed mission keeps no timer running. */
    private function endRunningSession(Mission $mission): void
    {
        $mission->focusSessions()->whereNull('end_time')->get()->each(fn (FocusSession $session) => $session->finish());
    }

    private function ensureOpen(Mission $mission): void
    {
        if (! $mission->isOpen()) {
            throw ValidationException::withMessages([
                'status' => "This mission is already {$mission->status}.",
            ]);
        }
    }
}
