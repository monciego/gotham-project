<?php

namespace App\Http\Controllers;

use App\Http\Resources\SubtaskResource;
use App\Models\Mission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SubtaskController extends Controller
{
    public function index(Request $request, int $mission): JsonResponse
    {
        return $this->success(SubtaskResource::collection($this->mission($request, $mission)->subtasks));
    }

    public function store(Request $request, int $mission): JsonResponse
    {
        $validated = $request->validate(['title' => ['required', 'string', 'max:255']]);
        $model = $this->mission($request, $mission);

        $subtask = $model->subtasks()->create([
            'title' => $validated['title'],
            'order' => (int) $model->subtasks()->max('order') + 1,
        ]);

        return $this->success(new SubtaskResource($subtask), 'Subtask added.', 201);
    }

    public function update(Request $request, int $mission, int $subtask): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'completed' => ['sometimes', 'boolean'],
        ]);

        $model = $this->mission($request, $mission)->subtasks()->findOrFail($subtask);
        $model->update($validated);

        return $this->success(new SubtaskResource($model), 'Subtask updated.');
    }

    public function destroy(Request $request, int $mission, int $subtask): JsonResponse
    {
        $this->mission($request, $mission)->subtasks()->findOrFail($subtask)->delete();

        return $this->success(message: 'Subtask deleted.');
    }

    /** `ids` lists every subtask of the mission in its new order. */
    public function reorder(Request $request, int $mission): JsonResponse
    {
        $validated = $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['integer', 'distinct'],
        ]);

        $model = $this->mission($request, $mission);
        $existing = $model->subtasks()->pluck('id')->sort()->values()->all();
        $given = collect($validated['ids'])->sort()->values()->all();

        if ($existing !== $given) {
            throw ValidationException::withMessages(['ids' => 'List every subtask of this mission exactly once.']);
        }

        DB::transaction(function () use ($model, $validated) {
            foreach ($validated['ids'] as $position => $id) {
                $model->subtasks()->whereKey($id)->update(['order' => $position]);
            }
        });

        return $this->success(SubtaskResource::collection($model->subtasks()->get()), 'Subtasks reordered.');
    }

    private function mission(Request $request, int $id): Mission
    {
        return $request->user()->missions()->findOrFail($id);
    }
}
