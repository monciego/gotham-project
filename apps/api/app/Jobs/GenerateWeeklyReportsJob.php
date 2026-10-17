<?php

namespace App\Jobs;

use App\Models\User;
use App\Services\ReportService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Bus\Dispatchable;

/**
 * Hourly: saves the weekly report for every user for whom it is now Sunday,
 * 11pm in their own timezone, and has Alfred mention it. Runs in the
 * scheduler's process (it isn't queued).
 */
class GenerateWeeklyReportsJob
{
    use Dispatchable;

    public function handle(ReportService $reports): void
    {
        User::query()->chunkById(200, fn ($users) => $users->each(function (User $user) use ($reports) {
            $now = CarbonImmutable::now($user->timezone);
            if ($now->dayOfWeekIso !== 7 || $now->hour !== 23) {
                return;
            }

            $report = $reports->store($user)->report;

            $user->alfredMessages()->create([
                'priority' => 'low',
                'mood' => 'encouraging',
                'title' => 'Your weekly report, sir.',
                'message' => $report['summary'],
                'actions' => [['label' => 'Read it', 'href' => '/overview#weekly-report']],
            ]);
        }));
    }
}
