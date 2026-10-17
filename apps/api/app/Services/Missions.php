<?php

namespace App\Services;

use App\Models\FocusSession;
use App\Models\Mission;
use Illuminate\Validation\ValidationException;

/** Mission changes shared by the missions endpoints and Alfred's actions. */
class Missions
{
    public function __construct(private CaseProgress $caseProgress) {}

    /** Lets an open mission go: its running session ends unfinished and its case recounts. */
    public function abandon(Mission $mission, string $reason): void
    {
        $this->ensureOpen($mission);

        $mission->update(['status' => 'abandoned', 'abandon_reason' => $reason]);
        $mission->focusSessions()->running()->get()
            ->each(fn (FocusSession $session) => $session->finish(completed: false));
        $this->caseProgress->recalculate($mission->case);
    }

    public function ensureOpen(Mission $mission): void
    {
        if (! $mission->isOpen()) {
            throw ValidationException::withMessages([
                'status' => "This mission is already {$mission->status}.",
            ]);
        }
    }
}
