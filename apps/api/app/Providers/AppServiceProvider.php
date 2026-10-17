<?php

namespace App\Providers;

use App\Support\Rewards;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // One collector per request; AttachRewards clears it as each request starts.
        $this->app->singleton(Rewards::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Reset links open the Next.js page, not a Laravel route.
        ResetPassword::createUrlUsing(fn (object $user, string $token) => config('app.frontend_url')
            .'/reset-password?token='.$token.'&email='.urlencode($user->getEmailForPasswordReset()));
    }
}
