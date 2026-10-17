<?php

namespace App\Http\Concerns;

use Illuminate\Http\JsonResponse;

/**
 * Every API response uses the same envelope:
 * {success: bool, message: string, data: any, errors: any}.
 */
trait ApiResponse
{
    protected function success(mixed $data = null, string $message = 'OK', int $status = 200): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data,
            'errors' => null,
        ], $status);
    }

    protected function error(string $message, mixed $errors = [], int $status = 400): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $message,
            'data' => null,
            'errors' => $errors ?: null,
        ], $status);
    }
}
