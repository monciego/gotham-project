<?php

namespace App\Http\Controllers;

use App\Http\Requests\CaseRequest;
use App\Http\Resources\CaseResource;
use App\Http\Resources\EarnedTrophyResource;
use App\Models\CaseFile;
use App\Models\Mission;
use App\Models\User;
use App\Services\AchievementService;
use App\Services\CaseAnalytics;
use App\Services\CaseProgress;
use App\Services\Xp;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CaseController extends Controller
{
    /** List order: the cases being worked on first. */
    private const STATUS_ORDER = ['active' => 0, 'planning' => 1, 'on_hold' => 2, 'completed' => 3, 'archived' => 4];

    public function __construct(
        private CaseProgress $progress,
        private CaseAnalytics $analytics,
        private AchievementService $achievements,
        private Xp $xp,
    ) {}

    /**
     * Every case (or those with `status`; `open` means planning, active or on
     * hold), active first, then by target date (none last).
     */
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'status' => ['sometimes', Rule::in([...array_keys(self::STATUS_ORDER), 'open'])],
        ]);
        $status = $filters['status'] ?? null;

        $cases = $request->user()->cases()
            ->withMissionCounts()
            ->when($status, fn (Builder $query) => $status === 'open' ? $query->open() : $query->where('status', $status))
            ->get()
            ->sortBy([
                fn (CaseFile $a, CaseFile $b) => self::STATUS_ORDER[$a->status] <=> self::STATUS_ORDER[$b->status],
                fn (CaseFile $a, CaseFile $b) => ($a->target_end_date?->timestamp ?? PHP_INT_MAX) <=> ($b->target_end_date?->timestamp ?? PHP_INT_MAX),
                fn (CaseFile $a, CaseFile $b) => $a->name <=> $b->name,
            ]);

        return $this->success(CaseResource::collection($cases->values()));
    }

    public function store(CaseRequest $request): JsonResponse
    {
        $case = $request->user()->cases()->create($request->caseData());
        $this->progress->snapshot($case);

        return $this->success($this->detail($request->user(), $case->id), 'Case opened, sir.', 201);
    }

    public function show(Request $request, int $case): JsonResponse
    {
        return $this->success($this->detail($request->user(), $case));
    }

    public function update(CaseRequest $request, int $case): JsonResponse
    {
        $user = $request->user();
        $model = $this->find($user, $case);
        $data = $request->caseData();

        // Reopening a closed case. Its XP was already granted and isn't granted again.
        if (isset($data['status']) && $model->status === 'completed') {
            $data['actual_end_date'] = null;
        }

        $model->update($data);

        if ($model->wasChanged('progress_mode') && $model->progress_mode === 'auto') {
            $this->progress->recalculate($model);
        }

        return $this->success($this->detail($user, $case), 'Case updated.');
    }

    /** Soft-deleted. Its missions stay, without a case. */
    public function destroy(Request $request, int $case): JsonResponse
    {
        $this->find($request->user(), $case)->delete();

        return $this->success(message: 'Case deleted.');
    }

    /** Sets progress by hand, for cases in manual mode. */
    public function updateProgress(Request $request, int $case): JsonResponse
    {
        $validated = $request->validate(['progress' => ['required', 'integer', 'min:0', 'max:100']]);
        $user = $request->user();
        $model = $this->find($user, $case);

        if ($model->progress_mode !== 'manual') {
            throw ValidationException::withMessages([
                'progress' => 'This case follows its missions, sir. Switch it to manual to set progress by hand.',
            ]);
        }

        $milestone = $this->progress->set($model, $validated['progress']);

        return $this->success([
            'case' => $this->detail($user, $case),
            'milestone' => $milestone,
        ], 'Progress noted.');
    }

    /** Closes the case: +500 XP (once per case), Alfred's word, and any trophies. */
    public function complete(Request $request, int $case): JsonResponse
    {
        $user = $request->user();
        $model = $this->find($user, $case);
        $levelBefore = $user->current_level;
        $xp = 0;

        if ($model->status === 'completed') {
            throw ValidationException::withMessages(['status' => 'This case is already closed, sir.']);
        }

        $trophies = DB::transaction(function () use ($user, $model, &$xp) {
            $model->update(['status' => 'completed', 'actual_end_date' => $user->today()->toDateString()]);

            if ($model->xp_awarded === 0) {
                $xp = CaseFile::XP;
                // Not mass-assignable, so requests can't set it.
                $model->forceFill(['xp_awarded' => $xp])->save();
                $this->xp->award($user, $xp, 'case_complete', $model->name);
            }

            $user->alfredMessages()->create([
                'priority' => 'medium',
                'mood' => 'proud',
                'title' => 'Case closed. Batman would be proud.',
                'message' => $xp > 0 ? "{$model->name} is closed. +{$xp} XP." : "{$model->name} is closed.",
                'actions' => [['label' => 'View case', 'href' => "/cases/{$model->id}"]],
            ]);

            return $this->achievements->checkAndAward($user, 'case_complete');
        });

        $user->refresh();

        return $this->success([
            'case' => $this->detail($user, $case),
            'xp_awarded' => $xp,
            'total_xp' => $user->total_xp,
            'current_level' => $user->current_level,
            'level_up' => $user->current_level > $levelBefore,
            'achievements' => EarnedTrophyResource::collection($trophies->values()),
        ], 'Case closed. Batman would be proud.');
    }

    public function analytics(Request $request, int $case): JsonResponse
    {
        $user = $request->user();

        return $this->success($this->analytics->for($this->find($user, $case), $user->today()));
    }

    private function find(User $user, int $id): CaseFile
    {
        return $user->cases()->findOrFail($id);
    }

    /** Open missions first by due date, then completed (latest first), then abandoned. */
    private function detail(User $user, int $id): CaseResource
    {
        $model = $user->cases()->withMissionCounts()->with([
            'missions' => fn (HasMany $query) => $query->withCount([
                'subtasks',
                'subtasks as subtasks_completed_count' => fn (Builder $query) => $query->where('completed', true),
            ]),
            'milestones' => fn (HasMany $query) => $query->orderBy('target_date')->orderBy('id'),
        ])->findOrFail($id);

        $rank = ['in_progress' => 0, 'not_started' => 0, 'completed' => 1, 'abandoned' => 2];
        $model->setRelation('missions', $model->missions->sortBy([
            fn (Mission $a, Mission $b) => $rank[$a->status] <=> $rank[$b->status],
            fn (Mission $a, Mission $b) => $a->status === 'completed'
                ? $b->completed_at <=> $a->completed_at
                : $a->due_date <=> $b->due_date,
        ])->values());

        return (new CaseResource($model))->withAnalytics($this->analytics->for($model, $user->today()));
    }
}
