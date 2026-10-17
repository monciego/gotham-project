<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\HelloController;
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
