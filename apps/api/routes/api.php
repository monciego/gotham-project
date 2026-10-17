<?php

use App\Http\Controllers\AlfredMessageController;
use App\Http\Controllers\ArsenalCheckInController;
use App\Http\Controllers\ArsenalController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CaseController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\FocusSessionController;
use App\Http\Controllers\HelloController;
use App\Http\Controllers\MissionController;
use App\Http\Controllers\MissionDependencyController;
use App\Http\Controllers\SubtaskController;
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

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::put('/profile', [AuthController::class, 'updateProfile']);
        Route::put('/password', [AuthController::class, 'updatePassword']);
        Route::delete('/account', [AuthController::class, 'deleteAccount']);
    });
});

Route::middleware('auth:sanctum')->group(function () {
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

    Route::get('/cases', [CaseController::class, 'index']);

    Route::get('/alfred-messages', [AlfredMessageController::class, 'index']);
    Route::post('/alfred-messages/{message}/dismiss', [AlfredMessageController::class, 'dismiss'])->whereNumber('message');
    Route::post('/alfred-messages/{message}/act', [AlfredMessageController::class, 'act'])->whereNumber('message');
});
