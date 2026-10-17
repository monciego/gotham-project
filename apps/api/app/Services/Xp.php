<?php

namespace App\Services;

use App\Models\User;
use App\Support\Rewards;

/**
 * Every XP change goes through here: the user's total and level
 * (1,000 XP a level), a row in `xp_events`, the request's rewards, and
 * Alfred's word when a level is reached.
 */
class Xp
{
    public function __construct(private Rewards $rewards) {}

    /**
     * Negative amounts take XP back (undoing a check-in, deleting an entry).
     *
     * @param  string  $reason  A key, e.g. mission_complete, focus_complete, trophy.
     * @param  string|null  $label  What it was for, e.g. the mission's title.
     * @return array{xp_earned: int, new_total: int, leveled_up: bool, new_level: int}
     */
    public function award(User $user, int $amount, string $reason, ?string $label = null): array
    {
        // A user created in memory hasn't loaded the column's default yet.
        $before = $user->current_level ?? 1;

        if ($amount !== 0) {
            $user->gainXp($amount);

            $user->xpEvents()->create([
                'amount' => $amount,
                'reason' => $reason,
                'label' => $label === null ? null : mb_substr($label, 0, 255),
                'total_after' => $user->total_xp,
                'level_before' => $before,
                'level_after' => $user->current_level,
            ]);

            $this->rewards->xp($amount, $reason, $label, $before, $user->current_level);
        }

        $leveledUp = $user->current_level > $before;

        if ($leveledUp) {
            $user->alfredMessages()->create([
                'priority' => 'medium',
                'mood' => 'proud',
                'title' => "Level {$user->current_level}, sir.",
                'message' => "You're becoming who you need to be, sir.",
                'actions' => [['label' => 'View trophies', 'href' => '/trophies']],
                // Shown on screen as it happened, so it goes straight into the history.
                'read_at' => now(),
            ]);
        }

        return [
            'xp_earned' => $amount,
            'new_total' => $user->total_xp,
            'leveled_up' => $leveledUp,
            'new_level' => $user->current_level,
        ];
    }
}
