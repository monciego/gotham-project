<?php

namespace App\Jobs;

use App\Models\Resource;
use App\Services\RecurringResources;
use Illuminate\Foundation\Bus\Dispatchable;

/**
 * Daily: adds the copies of every recurring transaction that has fallen due.
 * Runs in the scheduler's process (it isn't queued), so no queue worker is needed.
 */
class RecurringTransactionJob
{
    use Dispatchable;

    public function handle(RecurringResources $recurring): void
    {
        Resource::query()
            ->where('recurring', true)
            ->whereNotNull('recurring_frequency')
            ->with('user')
            ->chunkById(200, fn ($templates) => $templates->each(fn (Resource $template) => $recurring->generate($template)));
    }
}
