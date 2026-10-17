<?php

namespace App\Services;

use App\Models\User;

/**
 * Switching the user's life mode. Each switch is logged in
 * `system_intelligence` as the `mode_history` pattern:
 * {"changes": [{"from", "to", "at", "source"}]}, the latest 100, newest last,
 * so Alfred can learn how modes are used.
 */
class Modes
{
    private const HISTORY = 'mode_history';

    private const KEEP = 100;

    /** What Alfred says on switching to the mode, {title, message}. */
    public static function announcement(string $mode): array
    {
        return $mode === 'rest'
            ? ['title' => 'Rest mode, sir.', 'message' => "Rest is productive too, sir. I'll be here when you're ready."]
            : ['title' => 'Mode changed, sir.', 'message' => ucfirst($mode).' mode. Adjusting accordingly.'];
    }

    /**
     * Sets the mode; does nothing when it's already set.
     *
     * @param  string  $source  settings | alfred | onboarding
     * @return bool Whether the mode changed.
     */
    public function switch(User $user, string $mode, string $source = 'settings'): bool
    {
        $from = $user->mode();
        if ($from === $mode) {
            return false;
        }

        $user->update(['current_mode' => $mode]);

        $row = $user->systemIntelligence()->firstOrNew(['pattern_type' => self::HISTORY]);
        $changes = [...($row->pattern_data['changes'] ?? []), [
            'from' => $from,
            'to' => $mode,
            'at' => now()->toIso8601String(),
            'source' => $source,
        ]];
        $row->fill([
            'pattern_data' => ['changes' => array_slice($changes, -self::KEEP)],
            // A record, not an inference.
            'confidence' => 1,
        ])->save();

        return true;
    }
}
