<?php

use App\Http\Middleware\AttachRewards;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        apiPrefix: 'api/v1',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Outermost, so it sees everything the request earned.
        $middleware->api(prepend: [AttachRewards::class]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        // Errors use the same envelope as App\Http\Concerns\ApiResponse.
        $exceptions->render(function (Throwable $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            [$status, $message, $errors] = match (true) {
                $e instanceof ValidationException => [422, $e->getMessage(), $e->errors()],
                $e instanceof AuthenticationException => [401, 'Unauthenticated.', null],
                $e instanceof HttpExceptionInterface => [
                    $e->getStatusCode(),
                    $e->getMessage() ?: 'Request failed.',
                    null,
                ],
                default => [
                    500,
                    config('app.debug') ? $e->getMessage() : 'Something went wrong.',
                    null,
                ],
            };

            return response()->json([
                'success' => false,
                'message' => $message,
                'data' => null,
                'errors' => $errors,
            ], $status);
        });
    })->create();
