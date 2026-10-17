<?php

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use App\Services\AchievementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The first-run flow. Each step saves through its own endpoint (habits,
 * the first mission, settings, mode); this marks the flow done.
 */
class OnboardingController extends Controller
{
    public function __construct(private AchievementService $achievements) {}

    public function complete(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->onboarding_completed) {
            $user->update(['onboarding_completed' => true]);
            $this->achievements->checkAndAward($user, 'onboarding_complete');
        }

        return $this->success(new UserResource($user->refresh()), 'Alfred is ready.');
    }
}
