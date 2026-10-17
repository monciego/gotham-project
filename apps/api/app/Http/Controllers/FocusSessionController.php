<?php

namespace App\Http\Controllers;

use App\Http\Resources\FocusSessionResource;
use App\Models\Achievement;
use App\Models\FocusSession;
use App\Services\Achievements;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Timed work sessions on a mission. Only one runs at a time: starting a new
 * one ends any other, unfinished.
 */
class FocusSessionController extends Controller
{
    public function __construct(private Achievements $achievements) {}

    public function store(Request $request, int $mission): JsonResponse
    {
        $validated = $request->validate([
            'duration_minutes' => ['sometimes', 'integer', 'min:5', 'max:180'],
            'energy_before' => ['sometimes', 'nullable', 'integer', 'between:1,5'],
        ]);

        $user = $request->user();
        $model = $user->missions()->findOrFail($mission);

        if (! $model->isOpen()) {
            throw ValidationException::withMessages(['mission' => "This mission is already {$model->status}."]);
        }

        $user->focusSessions()->whereNull('end_time')->get()
            ->each(fn (FocusSession $session) => $session->finish(completed: false));

        $session = $user->focusSessions()->create([
            'mission_id' => $model->id,
            'start_time' => now(),
            'duration_minutes' => $validated['duration_minutes'] ?? 25,
            'energy_before' => $validated['energy_before'] ?? null,
        ]);

        if ($model->status === 'not_started') {
            $model->update(['status' => 'in_progress']);
        }

        return $this->success(new FocusSessionResource($session), 'Session started. I shall keep the time, sir.', 201);
    }

    /** `completed` is true when the timer ran out, false when stopped early. */
    public function end(Request $request, int $session): JsonResponse
    {
        $validated = $request->validate([
            'completed' => ['required', 'boolean'],
            'energy_after' => ['sometimes', 'nullable', 'integer', 'between:1,5'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ]);

        $user = $request->user();
        $model = $user->focusSessions()->findOrFail($session);

        if ($model->end_time !== null) {
            throw ValidationException::withMessages(['session' => 'This session has already ended.']);
        }

        $model->fill([
            'energy_after' => $validated['energy_after'] ?? null,
            'notes' => $validated['notes'] ?? null,
        ]);
        $model->finish($validated['completed']);
        $trophies = $this->achievements->check($user);

        return $this->success([
            'session' => new FocusSessionResource($model),
            'achievements' => $trophies->map(fn (Achievement $achievement) => [
                'key' => $achievement->key,
                'name' => $achievement->name,
                'description' => $achievement->description,
                'rarity' => $achievement->rarity,
                'xp_reward' => $achievement->xp_reward,
            ])->values(),
        ], 'Session ended.');
    }
}
