<?php

namespace App\Services;

use App\Models\FocusSession;
use App\Models\Mission;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Starting and ending focus sessions. Only one runs per user: starting a new
 * one ends the previous one, unfinished.
 */
class FocusSessions
{
    public function start(User $user, ?Mission $mission, int $minutes, ?int $energyBefore): FocusSession
    {
        return DB::transaction(function () use ($user, $mission, $minutes, $energyBefore) {
            $user->focusSessions()->running()->get()
                ->each(fn (FocusSession $session) => $session->finish(completed: false));

            if ($mission?->status === 'not_started') {
                $mission->update(['status' => 'in_progress']);
            }

            return $user->focusSessions()->create([
                'mission_id' => $mission?->id,
                'start_time' => now(),
                'duration_minutes' => $minutes,
                'energy_before' => $energyBefore,
            ]);
        });
    }

    /**
     * Ends the session as completed, awards its XP and has Alfred say so.
     * Doesn't check trophies; callers do, once they've finished their own work.
     *
     * Pass the same `$user` instance the caller awards other XP to, so neither
     * overwrites the other's total.
     *
     * @return int The XP awarded.
     */
    public function complete(User $user, FocusSession $session): int
    {
        return DB::transaction(function () use ($user, $session) {
            $session->finish(completed: true);

            $xp = $session->xpReward();
            if ($xp > 0) {
                // Not mass-assignable, so requests can't set it.
                $session->forceFill(['xp_awarded' => $xp])->save();
                $user->gainXp($xp);
            }

            $user->alfredMessages()->create([
                'priority' => 'low',
                'mood' => 'proud',
                'title' => 'Well done, sir.',
                'message' => "{$session->duration_minutes} minutes of focused work.",
            ]);

            return $xp;
        });
    }
}
