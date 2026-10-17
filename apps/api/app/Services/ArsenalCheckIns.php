<?php

namespace App\Services;

use App\Models\Achievement;
use App\Models\Arsenal;
use App\Models\ArsenalLog;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Completing today's check-in for a habit, for the check-in endpoint and
 * Alfred's "protect the streak" action alike.
 */
class ArsenalCheckIns
{
    /** Alfred's line for each streak milestone. */
    private const MILESTONE_TITLES = [
        7 => "Seven in a row, sir. That's no longer luck. That's discipline.",
        30 => 'Thirty in a row, sir. Gotham will notice the difference.',
        100 => "One hundred in a row, sir. I confess I'm rather proud.",
    ];

    public function __construct(
        private ArsenalStreaks $streaks,
        private AchievementService $achievements,
        private Xp $xp,
    ) {}

    /**
     * Measurable habits log `value` (the target when left out); +20 XP at or above the target.
     *
     * @return array{xp: int, milestone: int|null, trophies: Collection<int, Achievement>}
     */
    public function complete(User $user, Arsenal $habit, ?int $value = null, ?string $note = null): array
    {
        $log = $this->todaysLog($habit, $user);

        if ($log?->completed) {
            throw ValidationException::withMessages(['habit' => 'Already done today, sir.']);
        }

        $value = $habit->isMeasurable() ? ($value ?? $habit->target_value) : null;
        $xp = $habit->xpFor($value);

        return DB::transaction(function () use ($user, $habit, $log, $value, $xp, $note) {
            $log ??= $this->newLog($habit, $user);
            $log->fill([
                'completed' => true,
                'skipped' => false,
                'value' => $value,
                'note' => $note,
                'completed_at' => now(),
            ]);
            // Not mass-assignable, so requests can't set it.
            $log->forceFill(['xp_awarded' => $xp])->save();
            $this->xp->award($user, $xp, 'habit_complete', $habit->name);

            $streak = $this->streaks->refresh($habit, $user);
            $milestone = $this->streaks->milestoneReached($streak['before'], $streak['after']);
            if ($milestone) {
                $this->announceMilestone($user, $habit, $milestone);
            }

            return [
                'xp' => $xp,
                'milestone' => $milestone,
                'trophies' => $this->achievements->checkAndAward($user, 'habit_complete'),
            ];
        });
    }

    public function todaysLog(Arsenal $habit, User $user): ?ArsenalLog
    {
        return $habit->logs()->whereDate('date', $user->today())->first();
    }

    public function newLog(Arsenal $habit, User $user): ArsenalLog
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
            // Shown on screen as it happened, so it goes straight into the history.
            'read_at' => now(),
        ]);
    }
}
