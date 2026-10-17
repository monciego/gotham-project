<?php

namespace App\Http\Middleware;

use App\Services\AchievementService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

/**
 * Notes the first authenticated request of each of the user's days, for
 * the login streak, and checks trophies for it (the `daily_login` event).
 */
class RecordDailyActivity
{
    public function __construct(private AchievementService $achievements) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user !== null) {
            $date = $user->today()->toDateString();

            // Cache::add only succeeds once per key, so this runs once a day per user.
            if (Cache::add("active-day:{$user->id}:{$date}", true, now()->addDay())) {
                // Matched with whereDate: SQLite stores dates with a time.
                if (! $user->activityDays()->whereDate('date', $date)->exists()) {
                    $user->activityDays()->create(['date' => $date]);
                }
                $this->achievements->checkAndAward($user, 'daily_login');
            }
        }

        return $next($request);
    }
}
