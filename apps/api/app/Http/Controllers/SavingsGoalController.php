<?php

namespace App\Http\Controllers;

use App\Http\Requests\SavingsGoalRequest;
use App\Http\Resources\SavingsGoalResource;
use App\Models\Resource;
use App\Models\SavingsGoal;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/** Savings goals, filled by linking transactions to them. */
class SavingsGoalController extends Controller
{
    /** Open goals by deadline (none last), then completed ones, newest first. */
    public function index(Request $request): JsonResponse
    {
        $goals = $request->user()->savingsGoals()->get();

        return $this->success([
            'active' => SavingsGoalResource::collection($goals->where('completed', false)->sortBy(fn (SavingsGoal $goal) => $goal->deadline?->timestamp ?? PHP_INT_MAX)->values()),
            'completed' => SavingsGoalResource::collection($goals->where('completed', true)->sortByDesc('completed_at')->values()),
        ]);
    }

    public function store(SavingsGoalRequest $request): JsonResponse
    {
        $goal = $request->user()->savingsGoals()->create($request->validated());

        return $this->success(new SavingsGoalResource($goal->refresh()), 'Goal set, sir.', 201);
    }

    public function show(Request $request, int $goal): JsonResponse
    {
        $model = $this->find($request->user(), $goal)->load(['contributions' => fn ($query) => $query->latest('date')->latest('id')]);

        return $this->success(new SavingsGoalResource($model));
    }

    public function update(SavingsGoalRequest $request, int $goal): JsonResponse
    {
        $model = $this->find($request->user(), $goal);
        $model->update($request->validated());
        // A new target may finish the goal, or reopen it.
        $model->recalculate();

        return $this->success(new SavingsGoalResource($model), 'Goal updated.');
    }

    /** Its transactions stay, unlinked. */
    public function destroy(Request $request, int $goal): JsonResponse
    {
        $this->find($request->user(), $goal)->delete();

        return $this->success(message: 'Goal deleted.');
    }

    /**
     * Puts money toward the goal: links an existing transaction (`resource_id`),
     * or records a new one (`amount`, optional `date`, `account`, `description`)
     * in the Savings category.
     */
    public function contribute(Request $request, int $goal): JsonResponse
    {
        $validated = $request->validate([
            'resource_id' => ['required_without:amount', 'integer'],
            'amount' => ['required_without:resource_id', 'numeric', 'decimal:0,2', 'min:0.01', 'max:99999999.99'],
            'date' => ['sometimes', 'date_format:Y-m-d'],
            'account' => ['sometimes', 'nullable', 'string', 'max:50'],
            'description' => ['sometimes', 'nullable', 'string', 'max:255'],
        ]);

        $user = $request->user();
        $model = $this->find($user, $goal);

        $completed = DB::transaction(function () use ($user, $model, $validated) {
            if (isset($validated['resource_id'])) {
                $resource = $user->resources()->findOrFail($validated['resource_id']);
                if ($resource->savings_goal_id !== null && $resource->savings_goal_id !== $model->id) {
                    throw ValidationException::withMessages(['resource_id' => 'That transaction already counts toward another goal, sir.']);
                }
            } else {
                $resource = $user->resources()->make([
                    'type' => 'expense',
                    'amount' => $validated['amount'],
                    'category' => Resource::SAVINGS_CATEGORY,
                    'date' => $validated['date'] ?? $user->today()->toDateString(),
                    'account' => $validated['account'] ?? null,
                    'description' => $validated['description'] ?? "Toward {$model->name}",
                ]);
            }

            $resource->savings_goal_id = $model->id;
            $resource->save();

            return $model->recalculate();
        });

        if ($completed) {
            $user->alfredMessages()->create([
                'priority' => 'medium',
                'mood' => 'proud',
                'title' => "Goal reached: {$model->name}",
                'message' => 'Every dollar accounted for, sir. Lucius would approve.',
                'actions' => [['label' => 'View goals', 'href' => '/resources/goals']],
                // Shown on screen as it happened, so it goes straight into the history.
                'read_at' => now(),
            ]);
        }

        return $this->success([
            'goal' => new SavingsGoalResource($model->load(['contributions' => fn ($query) => $query->latest('date')->latest('id')])),
            'completed_now' => $completed,
        ], $completed ? "Goal reached, sir. {$model->name} is fully funded." : 'Contribution recorded.');
    }

    /** Unlinks a transaction from the goal. The transaction itself stays. */
    public function removeContribution(Request $request, int $goal, int $resource): JsonResponse
    {
        $user = $request->user();
        $model = $this->find($user, $goal);
        // Not mass-assignable, so requests can't move transactions between goals.
        $model->contributions()->whereKey($resource)->firstOrFail()->forceFill(['savings_goal_id' => null])->save();
        $model->recalculate();

        return $this->success(new SavingsGoalResource($model->load(['contributions' => fn ($query) => $query->latest('date')->latest('id')])), 'Contribution removed.');
    }

    private function find(User $user, int $id): SavingsGoal
    {
        return $user->savingsGoals()->findOrFail($id);
    }
}
