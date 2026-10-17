<?php

namespace App\Http\Controllers;

use App\Http\Requests\CaseMilestoneRequest;
use App\Http\Resources\CaseMilestoneResource;
use App\Models\CaseFile;
use App\Models\CaseMilestone;
use App\Models\User;
use App\Services\Achievements;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Milestones along a case, by target date. Completing one can earn trophies. */
class CaseMilestoneController extends Controller
{
    public function __construct(private Achievements $achievements) {}

    public function index(Request $request, int $case): JsonResponse
    {
        $milestones = $this->case($request->user(), $case)->milestones()->orderBy('target_date')->orderBy('id')->get();

        return $this->success(CaseMilestoneResource::collection($milestones));
    }

    public function store(CaseMilestoneRequest $request, int $case): JsonResponse
    {
        $milestone = $this->case($request->user(), $case)->milestones()->make($request->safe()->only(['name', 'target_date']));
        $this->save($request, $milestone);

        return $this->success(new CaseMilestoneResource($milestone->refresh()), 'Milestone set, sir.', 201);
    }

    /** Renames, moves, completes or reopens a milestone. */
    public function update(CaseMilestoneRequest $request, int $case, int $milestone): JsonResponse
    {
        $model = $this->case($request->user(), $case)->milestones()->findOrFail($milestone);
        $model->fill($request->safe()->only(['name', 'target_date']));
        $completedNow = $this->save($request, $model);

        return $this->success(
            new CaseMilestoneResource($model),
            $completedNow ? 'Milestone reached, sir. One step closer.' : 'Milestone updated.',
        );
    }

    public function destroy(Request $request, int $case, int $milestone): JsonResponse
    {
        $this->case($request->user(), $case)->milestones()->findOrFail($milestone)->delete();

        return $this->success(message: 'Milestone removed.');
    }

    private function case(User $user, int $id): CaseFile
    {
        return $user->cases()->findOrFail($id);
    }

    /** Saves the milestone with its `completed` change, if any. Returns whether it was just completed. */
    private function save(CaseMilestoneRequest $request, CaseMilestone $milestone): bool
    {
        if ($request->has('completed')) {
            $completed = $request->boolean('completed');
            if ($completed !== $milestone->completed) {
                $milestone->completed = $completed;
                $milestone->completed_at = $completed ? now() : null;
            }
        }

        $milestone->save();
        $completedNow = $milestone->completed && ($milestone->wasRecentlyCreated || $milestone->wasChanged('completed'));

        if ($completedNow) {
            $this->achievements->check($request->user());
        }

        return $completedNow;
    }
}
