<?php

use App\Jobs\RecurringTransactionJob;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// The `scheduler` service in docker-compose runs `php artisan schedule:work`.
Schedule::job(new RecurringTransactionJob)->dailyAt('00:00')->withoutOverlapping();
