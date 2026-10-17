<?php

namespace App\Http\Controllers;

use App\Http\Requests\OperationRequest;
use App\Models\Operation;
use App\Models\User;
use App\Services\Operations;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/** The calendar. */
class OperationController extends Controller
{
    /** Longest range one request may ask for. */
    private const MAX_RANGE_DAYS = 100;

    private const FOCUS_REASONS = [
        'energy_pattern' => 'Set for when your energy peaks, sir.',
        'work_start' => 'An hour into your working day, sir. Before the inbox wins.',
        'default' => 'Set for mid-morning, sir. Tell me your working hours and I can do better.',
    ];

    public function __construct(private Operations $operations) {}

    /**
     * Everything overlapping [start, end): events, occurrences of recurring
     * ones, and habits with a reminder time. Dates or ISO 8601.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'start' => ['required', 'date'],
            'end' => ['required', 'date', 'after:start'],
        ]);

        $user = $request->user();
        $from = CarbonImmutable::parse($validated['start'], $user->timezone)->utc();
        $to = CarbonImmutable::parse($validated['end'], $user->timezone)->utc();

        if ($from->diffInDays($to) > self::MAX_RANGE_DAYS) {
            throw ValidationException::withMessages(['end' => 'At most '.self::MAX_RANGE_DAYS.' days at a time, sir.']);
        }

        return $this->success($this->operations->between($user, $from, $to));
    }

    public function store(OperationRequest $request): JsonResponse
    {
        $user = $request->user();
        $operation = $user->operations()->create($request->operationData());
        $this->operations->syncMission($operation, $user->timezone);

        return $this->success($this->present($user, $operation), 'On the calendar, sir.', 201);
    }

    public function show(Request $request, int $operation): JsonResponse
    {
        $user = $request->user();

        return $this->success($this->present($user, $user->operations()->findOrFail($operation)));
    }

    /** Edits the whole series of a recurring event. */
    public function update(OperationRequest $request, int $operation): JsonResponse
    {
        $user = $request->user();
        $model = $user->operations()->findOrFail($operation);
        $model->update($request->operationData());
        $this->operations->syncMission($model->refresh(), $user->timezone);

        return $this->success($this->present($user, $model), 'Event updated.');
    }

    public function destroy(Request $request, int $operation): JsonResponse
    {
        $request->user()->operations()->findOrFail($operation)->delete();

        return $this->success(message: 'Event removed.');
    }

    /**
     * A 2-hour focus block on `date` (default today) at the suggested time,
     * optionally for an open mission.
     */
    public function focusBlock(Request $request): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validate([
            'date' => ['sometimes', 'date_format:Y-m-d', 'after_or_equal:'.$user->today()->toDateString()],
            'mission_id' => ['sometimes', 'nullable', 'integer'],
        ]);

        $mission = isset($validated['mission_id']) ? $user->missions()->open()->find($validated['mission_id']) : null;
        if (isset($validated['mission_id']) && $mission === null) {
            throw ValidationException::withMessages(['mission_id' => 'Focus blocks are for open missions, sir.']);
        }

        $day = isset($validated['date']) ? CarbonImmutable::parse($validated['date'], $user->timezone) : $user->today();
        ['start' => $start, 'reason' => $reason, 'moved' => $moved] = $this->operations->suggestFocusStart($user, $day);

        $operation = $user->operations()->make([
            'mission_id' => $mission?->id,
            'title' => Operation::FOCUS_BLOCK_TITLE,
            'start_time' => $start,
            'end_time' => $start->addMinutes(Operation::FOCUS_BLOCK_MINUTES),
            'category' => 'work',
        ]);
        // Not mass-assignable: only this endpoint makes focus blocks.
        $operation->kind = 'focus_block';
        $operation->save();
        $this->operations->syncMission($operation, $user->timezone);

        return $this->success([
            'operation' => $this->present($user, $operation),
            'reason' => $reason,
            'moved' => $moved,
        ], $moved ? 'That time was spoken for or past, sir, so I found the next free two hours.' : self::FOCUS_REASONS[$reason], 201);
    }

    /** @return array<string, mixed> */
    private function present(User $user, Operation $operation): array
    {
        return $this->operations->present($operation->load('mission:id,title,status'), $user->timezone);
    }
}
