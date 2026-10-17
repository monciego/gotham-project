<?php

use App\Jobs\AlfredRoundsJob;
use App\Jobs\GenerateWeeklyReportsJob;
use App\Jobs\RecurringTransactionJob;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// The `scheduler` service in docker-compose runs `php artisan schedule:work`.
Schedule::job(new RecurringTransactionJob)->dailyAt('00:01')->withoutOverlapping();
// Each user's report is saved on Sunday at 11pm in their own timezone, so this checks every hour.
Schedule::job(new GenerateWeeklyReportsJob)->hourly()->withoutOverlapping();
// Procrastination, streak danger at 8pm, burnout and patterns at 11pm, each in the user's own timezone.
Schedule::job(new AlfredRoundsJob)->hourly()->withoutOverlapping();
