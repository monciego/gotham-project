<?php

namespace App\Jobs;

use App\Models\User;
use App\Services\AlfredIntelligence;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Bus\Dispatchable;

/**
 * Hourly: Alfred's rounds, timed by each user's own clock.
 * - 08:00–21:59: procrastination (no start after 10am, avoided missions).
 * - 20:00: streaks in danger.
 * - 23:00: burnout, energy patterns, and fresh insights.
 * Warnings are skipped during the user's quiet hours; the learning still runs.
 * Runs in the scheduler's process (it isn't queued).
 */
class AlfredRoundsJob
{
    use Dispatchable;

    /** Alfred doesn't nag before 8am or after 10pm. */
    private const WAKING_HOURS = [8, 21];

    public function handle(AlfredIntelligence $intelligence): void
    {
        User::query()->chunkById(200, fn ($users) => $users->each(function (User $user) use ($intelligence) {
            $hour = CarbonImmutable::now($user->timezone)->hour;
            $quiet = $user->inQuietHours();

            if (! $quiet && $hour >= self::WAKING_HOURS[0] && $hour <= self::WAKING_HOURS[1]) {
                $intelligence->detectProcrastination($user);
            }

            if (! $quiet && $hour === 20) {
                $intelligence->detectStreakDanger($user);
            }

            if ($hour === 23) {
                if (! $quiet) {
                    $intelligence->detectBurnout($user);
                }
                $intelligence->learnEnergyPatterns($user);
                $intelligence->generateInsights($user);
            }
        }));
    }
}
