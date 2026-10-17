<?php

namespace App\Services;

use App\Models\CaseFile;

/**
 * Keeps a case's progress, its daily snapshots, and Alfred's celebrations
 * at 25/50/75/100% (once each per case).
 */
class CaseProgress
{
    public const MARKS = [25, 50, 75, 100];

    private const LINES = [
        25 => 'A quarter of the way, sir. The trail is warming.',
        50 => 'Halfway there, sir. The case is turning in our favor.',
        75 => 'Three quarters done, sir. The end is in sight.',
        100 => 'Every piece is in place, sir. Shall we close the case?',
    ];

    /**
     * Auto cases: the share of their non-abandoned missions that are done.
     *
     * @return int|null The mark just crossed, if any.
     */
    public function recalculate(?CaseFile $case): ?int
    {
        if ($case === null || $case->progress_mode !== 'auto') {
            return null;
        }

        $statuses = $case->missions()->where('status', '!=', 'abandoned')->pluck('status');
        $completed = $statuses->filter(fn (string $status) => $status === 'completed')->count();

        return $this->set($case, $statuses->isEmpty() ? 0 : (int) round($completed / $statuses->count() * 100));
    }

    /** @return int|null The mark just crossed, if any. */
    public function set(CaseFile $case, int $progress): ?int
    {
        $case->update(['progress' => max(0, min(100, $progress))]);
        $this->snapshot($case);

        return $this->celebrate($case);
    }

    /** Records today's progress, replacing an earlier snapshot from today. */
    public function snapshot(CaseFile $case): void
    {
        $date = $case->user->today()->toDateString();
        // Matched with whereDate: SQLite stores dates with a time.
        $log = $case->progressLogs()->whereDate('date', $date)->first()
            ?? $case->progressLogs()->make(['date' => $date]);

        $log->progress = $case->progress;
        $log->save();
    }

    private function celebrate(CaseFile $case): ?int
    {
        $mark = collect(self::MARKS)
            ->filter(fn (int $mark) => $case->progress >= $mark && $case->progress_milestone < $mark)
            ->last();

        if ($mark === null || ! $case->isOpen()) {
            return null;
        }

        // Not mass-assignable: only progress itself moves it.
        $case->forceFill(['progress_milestone' => $mark])->save();

        $case->user->alfredMessages()->create([
            'priority' => $mark === 100 ? 'medium' : 'low',
            'mood' => 'proud',
            'title' => "{$case->name}: {$mark}%",
            'message' => self::LINES[$mark],
            'actions' => [['label' => $mark === 100 ? 'Close the case' : 'Open case', 'href' => "/cases/{$case->id}"]],
        ]);

        return $mark;
    }
}
