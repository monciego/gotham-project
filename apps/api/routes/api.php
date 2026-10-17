<?php

use App\Http\Controllers\AlfredController;
use App\Http\Controllers\ArsenalCheckInController;
use App\Http\Controllers\ArsenalController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BudgetController;
use App\Http\Controllers\CaseController;
use App\Http\Controllers\CaseMilestoneController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\FocusSessionController;
use App\Http\Controllers\HelloController;
use App\Http\Controllers\InsightController;
use App\Http\Controllers\IntelController;
use App\Http\Controllers\MissionController;
use App\Http\Controllers\MissionDependencyController;
use App\Http\Controllers\OperationController;
use App\Http\Controllers\OverviewController;
use App\Http\Controllers\ResourceController;
use App\Http\Controllers\SavingsGoalController;
use App\Http\Controllers\SubtaskController;
use App\Http\Controllers\TrophyController;
use App\Http\Middleware\RecordDailyActivity;
use Illuminate\Support\Facades\Route;

// Every route in this file is served under /api/v1 (see bootstrap/app.php).

Route::get('/hello', HelloController::class);

Route::prefix('auth')->group(function () {
    Route::middleware('throttle:10,1')->group(function () {
        Route::post('/register', [AuthController::class, 'register']);
        Route::post('/login', [AuthController::class, 'login']);
        Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
        Route::post('/reset-password', [AuthController::class, 'resetPassword']);
    });

    Route::middleware(['auth:sanctum', RecordDailyActivity::class])->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::put('/profile', [AuthController::class, 'updateProfile']);
        Route::put('/password', [AuthController::class, 'updatePassword']);
        Route::delete('/account', [AuthController::class, 'deleteAccount']);
    });
});

Route::middleware(['auth:sanctum', RecordDailyActivity::class])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index']);

    Route::controller(ArsenalController::class)->group(function () {
        Route::get('/arsenal', 'index');
        Route::post('/arsenal', 'store');
        Route::get('/arsenal/today', 'today');
        Route::get('/arsenal/{arsenal}', 'show')->whereNumber('arsenal');
        Route::put('/arsenal/{arsenal}', 'update')->whereNumber('arsenal');
        Route::delete('/arsenal/{arsenal}', 'destroy')->whereNumber('arsenal');
        Route::get('/arsenal/{arsenal}/logs', 'logs')->whereNumber('arsenal');
    });

    Route::controller(ArsenalCheckInController::class)->group(function () {
        Route::post('/arsenal/{arsenal}/complete', 'complete')->whereNumber('arsenal');
        Route::post('/arsenal/{arsenal}/skip', 'skip')->whereNumber('arsenal');
        // Undoes today's check-in, completed or skipped.
        Route::delete('/arsenal/{arsenal}/complete', 'undo')->whereNumber('arsenal');
    });

    Route::controller(MissionController::class)->group(function () {
        Route::get('/missions', 'index');
        Route::post('/missions', 'store');
        Route::get('/missions/{mission}', 'show')->whereNumber('mission');
        Route::put('/missions/{mission}', 'update')->whereNumber('mission');
        Route::delete('/missions/{mission}', 'destroy')->whereNumber('mission');
        Route::post('/missions/{mission}/complete', 'complete')->whereNumber('mission');
        Route::post('/missions/{mission}/abandon', 'abandon')->whereNumber('mission');
        Route::post('/missions/{mission}/start', 'start')->whereNumber('mission');
    });

    Route::controller(SubtaskController::class)->group(function () {
        Route::get('/missions/{mission}/subtasks', 'index')->whereNumber('mission');
        Route::post('/missions/{mission}/subtasks', 'store')->whereNumber('mission');
        Route::post('/missions/{mission}/subtasks/reorder', 'reorder')->whereNumber('mission');
        Route::put('/missions/{mission}/subtasks/{subtask}', 'update')->whereNumber(['mission', 'subtask']);
        Route::delete('/missions/{mission}/subtasks/{subtask}', 'destroy')->whereNumber(['mission', 'subtask']);
    });

    Route::post('/missions/{mission}/dependencies', [MissionDependencyController::class, 'store'])->whereNumber('mission');
    Route::delete('/missions/{mission}/dependencies/{dependsOn}', [MissionDependencyController::class, 'destroy'])->whereNumber(['mission', 'dependsOn']);

    Route::controller(FocusSessionController::class)->group(function () {
        Route::get('/focus-sessions', 'index');
        Route::post('/focus-sessions', 'store');
        Route::get('/focus-sessions/{session}', 'show')->whereNumber('session');
        Route::post('/focus-sessions/{session}/complete', 'complete')->whereNumber('session');
        Route::post('/focus-sessions/{session}/abandon', 'abandon')->whereNumber('session');
        Route::patch('/focus-sessions/{session}/energy', 'updateEnergy')->whereNumber('session');
    });

    Route::controller(IntelController::class)->group(function () {
        Route::get('/intel', 'index');
        Route::post('/intel', 'store');
        Route::get('/intel/prompt', 'prompt');
        Route::get('/intel/insights', 'insights');
        Route::get('/intel/{intel}', 'show')->whereNumber('intel');
        Route::put('/intel/{intel}', 'update')->whereNumber('intel');
        Route::delete('/intel/{intel}', 'destroy')->whereNumber('intel');
    });

    Route::controller(ResourceController::class)->group(function () {
        Route::get('/resources', 'index');
        Route::post('/resources', 'store');
        Route::get('/resources/summary', 'summary');
        Route::get('/resources/categories', 'categories');
        Route::get('/resources/export', 'export');
        Route::post('/resources/bulk-delete', 'bulkDestroy');
        Route::get('/resources/{resource}', 'show')->whereNumber('resource');
        Route::put('/resources/{resource}', 'update')->whereNumber('resource');
        Route::delete('/resources/{resource}', 'destroy')->whereNumber('resource');
    });

    Route::controller(BudgetController::class)->group(function () {
        Route::get('/budgets', 'index');
        Route::post('/budgets', 'store');
        Route::put('/budgets', 'sync');
        Route::get('/budgets/recommendations', 'recommendations');
        Route::put('/budgets/{budget}', 'update')->whereNumber('budget');
        Route::delete('/budgets/{budget}', 'destroy')->whereNumber('budget');
    });

    Route::controller(SavingsGoalController::class)->group(function () {
        Route::get('/savings-goals', 'index');
        Route::post('/savings-goals', 'store');
        Route::get('/savings-goals/{goal}', 'show')->whereNumber('goal');
        Route::put('/savings-goals/{goal}', 'update')->whereNumber('goal');
        Route::delete('/savings-goals/{goal}', 'destroy')->whereNumber('goal');
        Route::post('/savings-goals/{goal}/contributions', 'contribute')->whereNumber('goal');
        Route::delete('/savings-goals/{goal}/contributions/{resource}', 'removeContribution')->whereNumber(['goal', 'resource']);
    });

    Route::controller(OperationController::class)->group(function () {
        Route::get('/operations', 'index');
        Route::post('/operations', 'store');
        Route::post('/operations/focus-block', 'focusBlock');
        Route::get('/operations/{operation}', 'show')->whereNumber('operation');
        Route::put('/operations/{operation}', 'update')->whereNumber('operation');
        Route::delete('/operations/{operation}', 'destroy')->whereNumber('operation');
    });

    Route::controller(CaseController::class)->group(function () {
        Route::get('/cases', 'index');
        Route::post('/cases', 'store');
        Route::get('/cases/{case}', 'show')->whereNumber('case');
        Route::put('/cases/{case}', 'update')->whereNumber('case');
        Route::delete('/cases/{case}', 'destroy')->whereNumber('case');
        Route::post('/cases/{case}/complete', 'complete')->whereNumber('case');
        Route::patch('/cases/{case}/progress', 'updateProgress')->whereNumber('case');
        Route::get('/cases/{case}/analytics', 'analytics')->whereNumber('case');
    });

    Route::controller(CaseMilestoneController::class)->group(function () {
        Route::get('/cases/{case}/milestones', 'index')->whereNumber('case');
        Route::post('/cases/{case}/milestones', 'store')->whereNumber('case');
        Route::put('/cases/{case}/milestones/{milestone}', 'update')->whereNumber(['case', 'milestone']);
        Route::delete('/cases/{case}/milestones/{milestone}', 'destroy')->whereNumber(['case', 'milestone']);
    });

    Route::controller(OverviewController::class)->group(function () {
        Route::get('/overview', 'index');
        Route::get('/overview/report', 'report');
        Route::get('/overview/reports', 'reports');
    });

    Route::get('/overview/insights', [InsightController::class, 'index']);
    // Recomputing reads 60 days of everything, so it is rate limited.
    Route::post('/overview/insights/generate', [InsightController::class, 'generate'])->middleware('throttle:6,1');

    Route::controller(TrophyController::class)->group(function () {
        Route::get('/trophies', 'index');
        Route::get('/trophies/leaderboard', 'leaderboard');
        Route::get('/trophies/{trophy}', 'show')->whereNumber('trophy');
        Route::get('/user/xp-history', 'xpHistory');
    });

    Route::controller(AlfredController::class)->group(function () {
        Route::get('/alfred/messages', 'index');
        Route::patch('/alfred/messages/read-all', 'readAll');
        Route::patch('/alfred/messages/{message}/dismiss', 'dismiss')->whereNumber('message');
        Route::patch('/alfred/messages/{message}/read', 'read')->whereNumber('message');
        Route::post('/alfred/messages/{message}/action', 'action')->whereNumber('message');
    });
});
