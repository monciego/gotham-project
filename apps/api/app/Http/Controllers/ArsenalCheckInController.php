<?php

namespace App\Http\Controllers;

use App\Http\Resources\EarnedTrophyResource;
use App\Models\Arsenal;
use App\Models\User;
use App\Services\ArsenalCheckIns;
use App\Services\ArsenalStreaks;
use App\Services\Xp;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Today's check-in for a habit (in the user's timezone): complete it, skip
 * it on purpose, or undo either.
 */
class ArsenalCheckInController extends Controller
{
    public function __construct(
        private ArsenalStreaks $streaks,
        private ArsenalCheckIns $checkIns,
        private Xp $xp,
    ) {}

    /** Measurable habits log `value` (the target when left out); +20 XP at or above the target. */
    public function complete(Request $request, int $arsenal): JsonResponse
    {
        $validated = $request->validate([
            'value' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:1000000'],
            'note' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);

        $user = $request->user();
        $habit = $this->find($user, $arsenal);
        $levelBefore = $user->current_level;

        $outcome = $this->checkIns->complete($user, $habit, $validated['value'] ?? null, $validated['note'] ?? null);
        $user->refresh();

        return $this->respond($user, $habit, [
            'xp_awarded' => $outcome['xp'],
            'level_up' => $user->current_level > $levelBefore,
            'milestone' => $outcome['milestone'],
            'achievements' => $outcome['trophies'],
        ], 'Habit completed.');
    }

    /** An intentional skip: today won't break the streak. */
    public function skip(Request $request, int $arsenal): JsonResponse
    {
        $validated = $request->validate(['reason' => ['sometimes', 'nullable', 'string', 'max:500']]);

        $user = $request->user();
        $habit = $this->find($user, $arsenal);
        $log = $this->checkIns->todaysLog($habit, $user);

        if ($log?->completed) {
            throw ValidationException::withMessages(['habit' => 'Already done today, sir. No need to skip it.']);
        }
        if ($log?->skipped) {
            throw ValidationException::withMessages(['habit' => 'Already skipped today, sir.']);
        }

        ($log ?? $this->checkIns->newLog($habit, $user))->fill([
            'completed' => false,
            'skipped' => true,
            'note' => $validated['reason'] ?? null,
        ])->save();
        $this->streaks->refresh($habit, $user);

        return $this->respond($user, $habit, [], 'Skipped for today. The streak is safe.');
    }

    /** Clears today's check-in, taking back its XP. */
    public function undo(Request $request, int $arsenal): JsonResponse
    {
        $user = $request->user();
        $habit = $this->find($user, $arsenal);
        $log = $this->checkIns->todaysLog($habit, $user);

        if ($log) {
            DB::transaction(function () use ($user, $habit, $log) {
                $this->xp->award($user, -$log->xp_awarded, 'habit_undo', $habit->name);
                $log->delete();
                $this->streaks->refresh($habit, $user);
            });
        }

        return $this->respond($user, $habit, ['xp_awarded' => -($log->xp_awarded ?? 0)], 'Check-in undone.');
    }

    private function find(User $user, int $id): Arsenal
    {
        $habit = $user->arsenal()->findOrFail($id);

        if (! $habit->active) {
            throw ValidationException::withMessages(['habit' => 'This habit is archived, sir. Restore it first.']);
        }

        return $habit;
    }

    /**
     * Every check-in returns the habit as the lists show it, plus what the check-in earned.
     *
     * @param  array{xp_awarded?: int, level_up?: bool, milestone?: int|null, achievements?: Collection}  $outcome
     */
    private function respond(User $user, Arsenal $habit, array $outcome, string $message): JsonResponse
    {
        $logs = $this->streaks->logsFor(collect([$habit]), $user->today())->get($habit->id, collect());

        return $this->success([
            'habit' => $this->streaks->present($habit, $logs, $user),
            'xp_awarded' => $outcome['xp_awarded'] ?? 0,
            'total_xp' => $user->total_xp,
            'current_level' => $user->current_level,
            'level_up' => $outcome['level_up'] ?? false,
            'milestone' => $outcome['milestone'] ?? null,
            'achievements' => EarnedTrophyResource::collection(($outcome['achievements'] ?? collect())->values()),
        ], $message);
    }
}
