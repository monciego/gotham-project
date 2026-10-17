<?php

namespace App\Http\Controllers;

use App\Http\Requests\SettingsRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\DataExport;
use App\Services\Modes;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/** Preferences, life mode and the data export. The profile itself is PUT /auth/profile. */
class SettingsController extends Controller
{
    public function __construct(private Modes $modes) {}

    public function show(Request $request): JsonResponse
    {
        return $this->success($this->settings($request->user()));
    }

    public function update(SettingsRequest $request): JsonResponse
    {
        $user = $request->user();
        $user->update($request->settings($user));

        return $this->success($this->settings($user), 'Noted, sir.');
    }

    /** Switches the life mode and logs it (App\Services\Modes). Alfred's words come back as the message. */
    public function updateMode(Request $request): JsonResponse
    {
        $validated = $request->validate(['mode' => ['required', Rule::in(User::MODES)]]);
        $user = $request->user();
        $this->modes->switch($user, $validated['mode']);

        $announcement = Modes::announcement($validated['mode']);

        return $this->success([
            'user' => new UserResource($user),
            'announcement' => $announcement,
        ], $announcement['message']);
    }

    /** Every feature's data as JSON files in one ZIP. */
    public function export(Request $request, DataExport $export): BinaryFileResponse
    {
        $user = $request->user();
        $filename = 'gotham-export-'.$user->today()->toDateString().'.zip';

        return response()->download($export->zip($user), $filename, ['Content-Type' => 'application/zip'])
            ->deleteFileAfterSend();
    }

    /** @return array<string, mixed> */
    private function settings(User $user): array
    {
        return [
            'current_mode' => $user->mode(),
            'notification_preferences' => $user->notificationPreferences(),
            'work_start_time' => $this->time($user->work_start_time),
            'work_end_time' => $this->time($user->work_end_time),
            'alfred_aggressiveness' => $user->aggressiveness(),
            'theme' => $user->theme ?? 'dark',
            'show_nav_subtitles' => $user->show_nav_subtitles ?? true,
        ];
    }

    /** "08:00:00" (Postgres time) as "08:00". */
    private function time(?string $time): ?string
    {
        return $time === null ? null : substr($time, 0, 5);
    }
}
