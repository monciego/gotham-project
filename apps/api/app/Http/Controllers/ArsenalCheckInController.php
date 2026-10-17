<?php

namespace App\Http\Controllers;

use App\Http\Resources\EarnedTrophyResource;
use App\Models\Arsenal;
use App\Models\ArsenalLog;
use App\Models\User;
use App\Services\Achievements;
use App\Services\ArsenalStreaks;
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
    /** Alfred's line for each streak milestone. */
    private const MILESTONE_TITLES = [
        7 => "Seven in a row, sir. That's no longer luck. That's discipline.",
        30 => 'Thirty in a row, sir. Gotham will notice the difference.',
        100 => "One hundred in a row, sir. I confess I'm rather proud.",
    ];

    public function __construct(
        private ArsenalStreaks $streaks,
        private Achievements $achievements,
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
        $log = $this->todaysLog($habit, $user);

        if ($log?->completed) {
            throw ValidationException::withMessages(['habit' => 'Already done today, sir.']);
        }

        $levelBefore = $user->current_level;
        $value = $habit->isMeasurable() ? ($validated['value'] ?? $habit->target_value) : null;
        $xp = $habit->xpFor($value);

        [$milestone, $trophies] = DB::transaction(function () use ($user, $habit, $log, $value, $xp, $validated) {
            $log ??= $this->newLog($habit, $user);
            $log->fill([
                'completed' => true,
                'skipped' => false,
                'value' => $value,
                'note' => $validated['note'] ?? null,
                'completed_at' => now(),
            ]);
            // Not mass-assignable, so requests can't set it.
            $log->forceFill(['xp_awarded' => $xp])->save();
            $user->gainXp($xp);

            $streak = $this->streaks->refresh($habit, $user);
            $milestone = $this->streaks->milestoneReached($streak['before'], $streak['after']);
            if ($milestone) {
                $this->announceMilestone($user, $habit, $milestone);
            }

            return [$milestone, $this->achievements->check($user)];
        });

        $user->refresh();

        return $this->respond($user, $habit, [
            'xp_awarded' => $xp,
            'level_up' => $user->current_level > $levelBefore,
            'milestone' => $milestone,
            'achievements' => $trophies,
        ], 'Habit completed.');
    }

    /** An intentional skip: today won't break the streak. */
    public function skip(Request $request, int $arsenal): JsonResponse
    {
        $validated = $request->validate(['reason' => ['sometimes', 'nullable', 'string', 'max:500']]);

        $user = $request->user();
        $habit = $this->find($user, $arsenal);
        $log = $this->todaysLog($habit, $user);

        if ($log?->completed) {
            throw ValidationException::withMessages(['habit' => 'Already done today, sir. No need to skip it.']);
        }
        if ($log?->skipped) {
            throw ValidationException::withMessages(['habit' => 'Already skipped today, sir.']);
        }

        ($log ?? $this->newLog($habit, $user))->fill([
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
        $log = $this->todaysLog($habit, $user);

        if ($log) {
            DB::transaction(function () use ($user, $habit, $log) {
                $user->gainXp(-$log->xp_awarded);
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

    private function todaysLog(Arsenal $habit, User $user): ?ArsenalLog
    {
        return $habit->logs()->whereDate('date', $user->today())->first();
    }

    private function newLog(Arsenal $habit, User $user): ArsenalLog
    {
        return new ArsenalLog([
            'arsenal_id' => $habit->id,
            'user_id' => $user->id,
            'date' => $user->today()->toDateString(),
        ]);
    }

    private function announceMilestone(User $user, Arsenal $habit, int $milestone): void
    {
        $unit = $habit->isWeekly() ? 'weeks' : 'days';
        $message = "{$habit->name}: {$milestone} {$unit} in a row.";

        // Undoing and redoing today's check-in crosses the milestone again; say it once.
        if ($user->alfredMessages()->where('message', $message)->where('created_at', '>=', now()->subDay())->exists()) {
            return;
        }

        $user->alfredMessages()->create([
            'priority' => 'medium',
            'mood' => 'proud',
            'title' => self::MILESTONE_TITLES[$milestone],
            'message' => $message,
            'actions' => [['label' => 'View habit', 'href' => "/arsenal/{$habit->id}"]],
        ]);
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
