<?php

namespace App\Http\Controllers;

use App\Http\Resources\AlfredMessageResource;
use App\Services\AchievementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AlfredMessageController extends Controller
{
    /** Unread messages, most urgent first, with the total for the notification bell. */
    public function index(Request $request): JsonResponse
    {
        $unread = $request->user()->alfredMessages()->unread()->active();

        return $this->success([
            'messages' => AlfredMessageResource::collection(
                (clone $unread)->orderByPriority()->latest()->limit(20)->get()
            ),
            'unread_count' => $unread->count(),
        ]);
    }

    public function dismiss(Request $request, int $message): JsonResponse
    {
        $alert = $request->user()->alfredMessages()->findOrFail($message);
        $alert->update([
            'dismissed_at' => now(),
            'read_at' => $alert->read_at ?? now(),
        ]);

        return $this->success(new AlfredMessageResource($alert), 'Dismissed.');
    }

    /** The user followed one of the message's actions. `acted_at` keeps the first time. */
    public function act(Request $request, int $message, AchievementService $achievements): JsonResponse
    {
        $alert = $request->user()->alfredMessages()->findOrFail($message);
        $alert->update([
            'action_taken' => true,
            'acted_at' => $alert->acted_at ?? now(),
            'dismissed_at' => now(),
            'read_at' => $alert->read_at ?? now(),
        ]);
        $achievements->checkAndAward($request->user(), 'alfred_action');

        return $this->success(new AlfredMessageResource($alert), 'Noted.');
    }
}
