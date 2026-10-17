<?php

namespace App\Http\Controllers;

use App\Models\Mission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * "Mission A depends on mission B": B should be done before A.
 */
class MissionDependencyController extends Controller
{
    public function store(Request $request, int $mission): JsonResponse
    {
        $validated = $request->validate(['depends_on_id' => ['required', 'integer']]);
        $missions = $request->user()->missions();
        $model = (clone $missions)->findOrFail($mission);
        $dependsOn = (clone $missions)->find($validated['depends_on_id']);

        if (! $dependsOn) {
            throw ValidationException::withMessages(['depends_on_id' => 'That mission was not found.']);
        }

        if ($dependsOn->is($model) || $this->dependsOn($dependsOn->id, $model->id)) {
            throw ValidationException::withMessages([
                'depends_on_id' => 'That would make these missions wait on each other forever.',
            ]);
        }

        $model->dependencies()->syncWithoutDetaching([$dependsOn->id]);

        return $this->success($this->summaries($model), 'Dependency added.', 201);
    }

    public function destroy(Request $request, int $mission, int $dependsOn): JsonResponse
    {
        $model = $request->user()->missions()->findOrFail($mission);
        $model->dependencies()->detach($dependsOn);

        return $this->success($this->summaries($model), 'Dependency removed.');
    }

    /** Whether $from already depends, directly or through others, on $target. */
    private function dependsOn(int $from, int $target): bool
    {
        $seen = [];
        $queue = [$from];

        while ($queue) {
            $next = DB::table('mission_dependencies')
                ->whereIn('mission_id', $queue)
                ->pluck('depends_on_mission_id')
                ->diff($seen)
                ->all();

            if (in_array($target, $next, true)) {
                return true;
            }

            $seen = [...$seen, ...$next];
            $queue = $next;
        }

        return false;
    }

    /** @return list<array<string, mixed>> */
    private function summaries(Mission $mission): array
    {
        return $mission->dependencies()->get()->map(fn (Mission $dependency) => [
            'id' => $dependency->id,
            'title' => $dependency->title,
            'status' => $dependency->status,
            'priority' => $dependency->priority,
            'due_date' => $dependency->due_date?->toDateString(),
        ])->all();
    }
}
