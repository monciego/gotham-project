<?php

namespace App\Http\Controllers;

use App\Http\Resources\AlfredMessageResource;
use App\Models\AlfredMessage;
use App\Models\Mission;
use App\Models\User;
use App\Services\AchievementService;
use App\Services\ArsenalCheckIns;
use App\Services\FocusSessions;
use App\Services\Missions;
use App\Services\Modes;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Alfred's messages: the list, reading, dismissing, and running a message's
 * actions (see App\Services\AlfredService for the action names).
 */
class AlfredController extends Controller
{
    /** Minutes in the session Alfred starts for an avoided mission. */
    private const FORCED_SESSION_MINUTES = 25;

    public function __construct(
        private AchievementService $achievements,
        private ArsenalCheckIns $checkIns,
        private FocusSessions $focus,
        private Missions $missions,
        private Modes $modes,
    ) {}

    /**
     * Not dismissed: unread first, then most urgent, then newest (10 at most),
     * with the unread count for the bell. `scope=all` lists the latest 50,
     * dismissed ones included, for the messages page.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate(['scope' => ['sometimes', 'in:all']]);
        $messages = $request->user()->alfredMessages();

        $list = isset($validated['scope'])
            ? (clone $messages)->latest()->latest('id')->limit(50)->get()
            : (clone $messages)->active()->orderByRaw('read_at is not null')->orderByPriority()->latest()->latest('id')->limit(10)->get();

        return $this->success([
            'messages' => AlfredMessageResource::collection($list),
            'unread_count' => (clone $messages)->unread()->active()->count(),
        ]);
    }

    public function dismiss(Request $request, int $message): JsonResponse
    {
        $alert = $this->find($request->user(), $message);
        $alert->update(['dismissed_at' => now(), 'read_at' => $alert->read_at ?? now()]);

        return $this->success(new AlfredMessageResource($alert), 'Dismissed.');
    }

    public function read(Request $request, int $message): JsonResponse
    {
        $alert = $this->find($request->user(), $message);
        $alert->update(['read_at' => $alert->read_at ?? now()]);

        return $this->success(new AlfredMessageResource($alert), 'Read.');
    }

    public function readAll(Request $request): JsonResponse
    {
        $count = $request->user()->alfredMessages()->unread()->update(['read_at' => now()]);

        return $this->success(['marked' => $count], 'All caught up, sir.');
    }

    /**
     * Runs one of the message's own actions (`action`), or records that a
     * link was followed (`action: link`). Asking for help (show_help) only
     * marks the message read: the problem it raised is still there.
     * Everything else counts as acting on it and puts it away. `result` tells the web what to do next:
     * {type: redirect, to} | {type: toast, title, message} | {type: help, mission} | {type: none}.
     */
    public function action(Request $request, int $message): JsonResponse
    {
        $validated = $request->validate([
            'action' => ['required', 'string', 'max:100'],
            'data' => ['sometimes', 'array'],
        ]);
        $user = $request->user();
        $alert = $this->find($user, $message);
        $action = $validated['action'];

        $offered = collect($alert->actions ?? []);
        $allowed = $action === 'link'
            ? $offered->contains(fn (array $item) => isset($item['href']))
            : $offered->contains(fn (array $item) => ($item['action'] ?? null) === $action);

        if (! $allowed) {
            throw ValidationException::withMessages(['action' => "That isn't one of this message's actions, sir."]);
        }

        $result = $this->run($user, $action, $validated['data'] ?? []);

        if ($action === 'show_help') {
            $alert->update(['read_at' => $alert->read_at ?? now()]);
        } else {
            $alert->update([
                'action_taken' => true,
                'acted_at' => $alert->acted_at ?? now(),
                'read_at' => $alert->read_at ?? now(),
                'dismissed_at' => now(),
            ]);
            $this->achievements->checkAndAward($user, 'alfred_action');
        }

        return $this->success([
            'message' => new AlfredMessageResource($alert),
            'result' => $result,
        ], 'Noted, sir.');
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function run(User $user, string $action, array $data): array
    {
        [$name, $argument] = array_pad(explode(':', $action, 2), 2, null);

        return match ($name) {
            'show_help' => ['type' => 'help', 'mission' => $this->summary($this->mostUrgent($user))],
            'start_mission' => $this->startMission($user, $data),
            'force_start' => $this->forceStart($user, (int) $argument),
            'abandon' => $this->abandon($user, (int) $argument),
            'switch_mode' => $this->switchMode($user, (string) $argument),
            'complete_habit' => $this->completeHabit($user, (int) $argument),
            'break_streak' => ['type' => 'toast', 'title' => 'As you wish, sir.', 'message' => 'A setback, not a defeat. Shall we begin again tomorrow?'],
            'dismiss', 'link' => ['type' => 'none'],
            default => throw ValidationException::withMessages(['action' => 'I don\'t know how to do that, sir.']),
        };
    }

    /** @param  array<string, mixed>  $data  An optional `mission_id`; otherwise the most urgent open mission. */
    private function startMission(User $user, array $data): array
    {
        $mission = isset($data['mission_id'])
            ? $user->missions()->open()->findOrFail((int) $data['mission_id'])
            : $this->mostUrgent($user);

        return ['type' => 'redirect', 'to' => $mission ? "/missions/{$mission->id}" : '/missions/new'];
    }

    private function forceStart(User $user, int $missionId): array
    {
        $mission = $user->missions()->findOrFail($missionId);
        $this->missions->ensureOpen($mission);
        $session = $this->focus->start($user, $mission, self::FORCED_SESSION_MINUTES, null);

        return ['type' => 'redirect', 'to' => "/focus/{$session->id}"];
    }

    private function abandon(User $user, int $missionId): array
    {
        $mission = $user->missions()->findOrFail($missionId);
        $this->missions->abandon($mission, "Let go at Alfred's prompt.");

        return ['type' => 'toast', 'title' => 'Understood, sir.', 'message' => "'{$mission->title}' is off the list. Not every battle is ours to fight."];
    }

    private function switchMode(User $user, string $mode): array
    {
        if (! in_array($mode, User::MODES, true)) {
            throw ValidationException::withMessages(['action' => 'There is no such mode, sir.']);
        }

        $this->modes->switch($user, $mode, 'alfred');

        return ['type' => 'toast', ...Modes::announcement($mode)];
    }

    private function completeHabit(User $user, int $habitId): array
    {
        $habit = $user->arsenal()->where('active', true)->findOrFail($habitId);
        $this->checkIns->complete($user, $habit);

        return ['type' => 'toast', 'title' => 'Streak protected, sir.', 'message' => "{$habit->name} is done for today."];
    }

    /** Overdue or due soonest, most important first. */
    private function mostUrgent(User $user): ?Mission
    {
        return $user->missions()->open()->orderBy('due_date')->orderByPriority()->first();
    }

    /** @return array{id: int, title: string}|null */
    private function summary(?Mission $mission): ?array
    {
        return $mission ? ['id' => $mission->id, 'title' => $mission->title] : null;
    }

    private function find(User $user, int $id): AlfredMessage
    {
        return $user->alfredMessages()->findOrFail($id);
    }
}
