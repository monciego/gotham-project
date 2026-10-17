<?php

namespace App\Services;

use App\Models\Resource;
use Carbon\CarbonImmutable;

/** Adds the copies of recurring transactions that have fallen due. */
class RecurringResources
{
    /** Stops a forgotten daily template from writing years of copies at once. */
    private const MAX_PER_RUN = 400;

    public function __construct(private Finance $finance) {}

    /**
     * Creates one copy for each due date after the latest existing one, up to
     * the owner's today. Safe to run any number of times.
     *
     * @return int How many copies were made.
     */
    public function generate(Resource $template): int
    {
        if (! $template->recurring || $template->recurring_frequency === null) {
            return 0;
        }

        $user = $template->user;
        // Y-m-d strings: the user's today is midnight in their timezone, stored dates are plain days.
        $today = $user->today()->toDateString();
        $latest = $template->occurrences()->max('date');
        $after = $latest ? CarbonImmutable::parse($latest)->toDateString() : $template->date->toDateString();
        $made = 0;

        for ($n = 1; $made < self::MAX_PER_RUN; $n++) {
            $date = $template->occurrence($n);
            if ($date->toDateString() > $today) {
                break;
            }
            if ($date->toDateString() <= $after) {
                continue;
            }

            $copy = $template->replicate(['recurring', 'recurring_frequency', 'savings_goal_id']);
            $copy->fill(['date' => $date->toDateString(), 'recurring' => false, 'recurring_frequency' => null]);
            $copy->recurring_source_id = $template->id;
            $copy->save();
            $made++;

            $this->finance->checkBudget($user, $copy);
        }

        return $made;
    }
}
