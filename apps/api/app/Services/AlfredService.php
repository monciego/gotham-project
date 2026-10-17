<?php

namespace App\Services;

use App\Models\AlfredMessage;
use App\Models\User;
use InvalidArgumentException;

/**
 * Alfred's standard messages. Each type fixes its priority, mood, words and
 * actions; `{placeholders}` are filled from `$data`.
 *
 * Actions with an `action` run through POST /alfred/messages/{id}/action:
 * show_help, start_mission, force_start:{mission}, abandon:{mission},
 * complete_habit:{habit}, break_streak, switch_mode:{mode}, dismiss.
 *
 * Receipts (`receipt`) record something the user just saw happen on screen,
 * so they're saved already read: they appear in the bell's history but not
 * as new alerts.
 */
class AlfredService
{
    public const TYPES = [
        'no_start' => [
            'priority' => 'critical',
            'mood' => 'concerned',
            'title' => '⚠️ BRUCE.',
            'message' => "It's {time} and you haven't started anything today. What's blocking you, sir?",
            'actions' => [
                ['label' => "I'm stuck, Alfred", 'action' => 'show_help', 'variant' => 'secondary'],
                ['label' => 'Start now', 'action' => 'start_mission', 'variant' => 'primary'],
            ],
            'requires_action' => true,
        ],
        'task_avoidance' => [
            'priority' => 'critical',
            'mood' => 'disappointed',
            'title' => '⚠️ PATTERN DETECTED',
            'message' => "You've postponed '{title}' {count} times, sir. Either do it now or let it go. Gotham cannot wait indefinitely.",
            'actions' => [
                ['label' => 'Start 25-min session', 'action' => 'force_start:{mission_id}', 'variant' => 'primary'],
                ['label' => "I don't actually care", 'action' => 'abandon:{mission_id}', 'variant' => 'danger'],
            ],
            'requires_action' => true,
            'subject' => 'mission_id',
        ],
        'streak_danger' => [
            'priority' => 'critical',
            'mood' => 'concerned',
            'title' => 'STREAK IN DANGER',
            'message' => '{count} days of showing up. {count} days of proof you can do this. Gone if you skip now. Is it worth it, sir?',
            'actions' => [
                ['label' => 'PROTECT THE STREAK', 'action' => 'complete_habit:{habit_id}', 'variant' => 'primary'],
                ['label' => "I don't care anymore", 'action' => 'break_streak', 'variant' => 'ghost'],
            ],
            'requires_action' => true,
            'subject' => 'habit_id',
        ],
        'session_complete' => [
            'priority' => 'low',
            'mood' => 'proud',
            'title' => 'Well done, sir.',
            'message' => "{minutes} minutes of focused work on '{mission}'. Gotham is a little safer tonight.",
            // Sessions without a mission.
            'message_without' => ['mission', '{minutes} minutes of focused work. Gotham is a little safer tonight.'],
            'requires_action' => false,
            'receipt' => true,
        ],
        'burnout_detected' => [
            'priority' => 'high',
            'mood' => 'concerned',
            'title' => 'Alfred is concerned.',
            'message' => 'Your recent entries suggest you may be pushing too hard, sir. Even Batman needs to recover. Consider Rest Mode.',
            'actions' => [
                ['label' => 'Switch to Rest Mode', 'action' => 'switch_mode:rest', 'variant' => 'primary'],
                ['label' => "I'm fine", 'action' => 'dismiss', 'variant' => 'secondary'],
            ],
            'requires_action' => true,
        ],
        'case_closed' => [
            'priority' => 'medium',
            'mood' => 'proud',
            'title' => 'Case closed.',
            'message' => "'{name}' is complete, sir. Another victory for Gotham. Batman would be proud.",
            'actions' => [['label' => 'View case', 'href' => '/cases/{case_id}']],
            'requires_action' => false,
            'receipt' => true,
        ],
        'achievement_unlocked' => [
            'priority' => 'medium',
            'mood' => 'proud',
            'title' => 'Trophy earned.',
            'message' => "'{achievement_name}' — {description}. Well earned, sir.",
            'actions' => [['label' => 'View trophies', 'href' => '/trophies']],
            'requires_action' => false,
            'receipt' => true,
        ],
    ];

    /** Creates the message. `$data` fills the placeholders; the type's `subject` key names its subject id. */
    public function sendMessage(User $user, string $type, array $data = []): AlfredMessage
    {
        $template = self::TYPES[$type] ?? throw new InvalidArgumentException("Unknown Alfred message type [{$type}].");
        $fill = fn (string $text) => $this->fill($text, $data);

        return $user->alfredMessages()->create([
            'type' => $type,
            'subject_id' => isset($template['subject']) ? (int) $data[$template['subject']] : null,
            'priority' => $template['priority'],
            'mood' => $template['mood'],
            'title' => $fill($template['title']),
            'message' => $fill(isset($template['message_without']) && ! isset($data[$template['message_without'][0]])
                ? $template['message_without'][1]
                : $template['message']),
            'actions' => array_map(
                fn (array $action) => array_map(fn ($value) => is_string($value) ? $fill($value) : $value, $action),
                $template['actions'] ?? [],
            ),
            'requires_action' => $template['requires_action'],
            'read_at' => ($template['receipt'] ?? false) ? now() : null,
        ]);
    }

    /**
     * Whether a message of this type (about this subject) was already sent
     * today in the user's timezone.
     */
    public function sentToday(User $user, string $type, ?int $subjectId = null): bool
    {
        return $user->alfredMessages()
            ->where('type', $type)
            ->when($subjectId !== null, fn ($query) => $query->where('subject_id', $subjectId))
            ->where('created_at', '>=', $user->today()->utc())
            ->exists();
    }

    /** @param  array<string, mixed>  $data */
    private function fill(string $text, array $data): string
    {
        return preg_replace_callback('/\{(\w+)\}/', fn (array $match) => array_key_exists($match[1], $data) ? (string) $data[$match[1]] : $match[0], $text);
    }
}
