<?php

namespace App\Http\Controllers;

use App\Services\AlfredIntelligence;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Alfred's insights from the last 60 days, cached for a day. */
class InsightController extends Controller
{
    public function __construct(private AlfredIntelligence $intelligence) {}

    public function index(Request $request): JsonResponse
    {
        return $this->success($this->intelligence->cached($request->user()));
    }

    public function generate(Request $request): JsonResponse
    {
        $insights = $this->intelligence->generateInsights($request->user());

        return $this->success($insights, $insights['insights'] === []
            ? 'Insufficient data, sir. Keep using Alfred. Patterns will emerge.'
            : 'I have looked again, sir.');
    }
}
