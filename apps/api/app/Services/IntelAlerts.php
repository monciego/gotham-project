<?php

namespace App\Services;

use App\Models\Intel;
use App\Models\User;

/** Alfred reads between the lines of new and edited entries. */
class IntelAlerts
{
    private const BURNOUT_TITLE = 'You sound worn down, sir.';

    private const LOW_STRETCH_TITLE = 'Three hard days in a row, sir.';

    public function __construct(private IntelSentiment $sentiment) {}

    public function check(User $user, Intel $entry): void
    {
        if ($this->sentiment->soundsBurnedOut(implode(' ', [$entry->plainContent(), $entry->struggles]))) {
            $this->say($user, self::BURNOUT_TITLE, 'Even Batman rests. Consider Rest mode for a day or two. Gotham will keep.', withinDays: 1);
        }

        if ($entry->sentiment_label === 'negative' && $this->negativeStretch($user, $entry)) {
            $this->say(
                $user,
                self::LOW_STRETCH_TITLE,
                "Your Intel has read heavy since {$entry->date->subDays(2)->format('l')}. Talk to someone you trust, and let me lighten tomorrow's load.",
                withinDays: 3,
            );
        }
    }

    /** The entry's day and the two before it were all negative. */
    private function negativeStretch(User $user, Intel $entry): bool
    {
        return $user->intel()
            ->whereDate('date', '>=', $entry->date->subDays(2))
            ->whereDate('date', '<=', $entry->date)
            ->where('sentiment_label', 'negative')
            ->count() === 3;
    }

    /** Says it at most once in `withinDays`, so edits don't repeat the alert. */
    private function say(User $user, string $title, string $message, int $withinDays): void
    {
        if ($user->alfredMessages()->where('title', $title)->where('created_at', '>=', now()->subDays($withinDays))->exists()) {
            return;
        }

        $user->alfredMessages()->create([
            'priority' => 'high',
            'mood' => 'concerned',
            'title' => $title,
            'message' => $message,
            'actions' => [['label' => 'Open Intel', 'href' => '/intel']],
        ]);
    }
}
