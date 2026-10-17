<?php

namespace App\Http\Controllers;

use App\Models\Arsenal;
use App\Models\ArsenalLog;
use App\Models\User;
use App\Services\ArsenalStreaks;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Checking a habit off for today (in the user's timezone), and undoing it.
 */
class ArsenalCompletionController extends Controller
{
    public function __construct(private ArsenalStreaks $streaks) {}

    public function store(Request $request, int $arsenal): JsonResponse
    {
        $validated = $request->validate([
            'value' => ['sometimes', 'nullable', 'integer', 'min:0'],
        ]);

        $user = $request->user();
        $habit = $user->arsenal()->findOrFail($arsenal);

        // A measurable habit is done once it reaches its target; one tap logs the full target.
        $value = $validated['value'] ?? $habit->target_value;
        $completed = $habit->type !== 'measurable' || $value >= (int) $habit->target_value;

        $log = $this->todaysLog($habit, $user) ?? new ArsenalLog([
            'arsenal_id' => $habit->id,
            'user_id' => $user->id,
            'date' => $user->today()->toDateString(),
        ]);
        $log->fill([
            'completed' => $completed,
            'skipped' => false,
            'value' => $value,
            'completed_at' => $completed ? now() : null,
        ])->save();

        $streak = $this->streaks->refresh($habit, $user);

        return $this->respond($habit, $completed, $this->streaks->milestoneReached($streak['before'], $streak['after']));
    }

    public function destroy(Request $request, int $arsenal): JsonResponse
    {
        $user = $request->user();
        $habit = $user->arsenal()->findOrFail($arsenal);

        $this->todaysLog($habit, $user)?->delete();
        $this->streaks->refresh($habit, $user);

        return $this->respond($habit, completed: false, milestone: null);
    }

    private function todaysLog(Arsenal $habit, User $user): ?ArsenalLog
    {
        return $habit->logs()->whereDate('date', $user->today())->first();
    }

    private function respond(Arsenal $habit, bool $completed, ?int $milestone): JsonResponse
    {
        return $this->success([
            'habit' => [
                'id' => $habit->id,
                'completed' => $completed,
                'current_streak' => $habit->current_streak,
                'best_streak' => $habit->best_streak,
                'streak_unit' => $habit->isWeekly() ? 'weeks' : 'days',
            ],
            'milestone' => $milestone,
        ], $completed ? 'Habit completed.' : 'Habit not completed.');
    }
}
