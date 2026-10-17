<?php

namespace App\Services;

use App\Models\Arsenal;
use App\Models\User;

/**
 * Today's journal prompt, from what the day held: a streak that broke,
 * yesterday's energy, missions closed and focus sessions. The first that
 * applies wins; otherwise a general prompt for the day.
 */
class IntelPrompts
{
    private const GENERAL = [
        'What did today teach you, sir?',
        'Where did your attention go today, and where did you want it to go?',
        'What would make tomorrow ten percent better?',
        'What are you avoiding, and why?',
        'Who helped you today, and did you thank them?',
        'What drained you today, and what restored you?',
        'If today were a case file, what would its title be?',
    ];

    public function __construct(private ArsenalStreaks $streaks) {}

    /** @return array{prompt: string, reason: string} */
    public function for(User $user): array
    {
        $today = $user->today();
        $dayStart = $today->utc();
        $dayEnd = $today->endOfDay()->utc();

        $broken = $this->brokenStreak($user);
        $yesterdayEnergy = $user->intel()->whereDate('date', $today->subDay())->value('energy_level');
        $missions = $user->missions()->completed()->whereBetween('completed_at', [$dayStart, $dayEnd])->count();
        $sessions = $user->focusSessions()->completed()->whereBetween('start_time', [$dayStart, $dayEnd])->count();

        return match (true) {
            $broken !== null => [
                'reason' => 'broken_streak',
                'prompt' => "Your {$broken} streak ended yesterday. What got in the way, and what would make it easier to start again?",
            ],
            $yesterdayEnergy !== null && $yesterdayEnergy <= 3 => [
                'reason' => 'low_energy',
                'prompt' => 'Your energy was low yesterday, sir. How are you holding up today, and what would help you recover?',
            ],
            $missions >= 3 => [
                'reason' => 'productive_day',
                'prompt' => "{$missions} missions closed today. What made today work, and how do we repeat it?",
            ],
            $sessions >= 2 => [
                'reason' => 'deep_work',
                'prompt' => "{$sessions} focus sessions today. What did the deep work make possible?",
            ],
            $missions === 0 && $sessions === 0 => [
                'reason' => 'quiet_day',
                'prompt' => 'A quiet day on the record, sir. What pulled your attention, and was it worth it?',
            ],
            default => [
                'reason' => 'general',
                'prompt' => self::GENERAL[$today->dayOfYear % count(self::GENERAL)],
            ],
        };
    }

    /** A habit that had a streak of 3 or more and lost it by missing yesterday. */
    private function brokenStreak(User $user): ?string
    {
        $today = $user->today();
        $yesterday = $today->subDay()->toDateString();
        $habits = $user->arsenal()->active()->where('type', '!=', 'weekly')->get();
        $logs = $this->streaks->logsFor($habits, $today);

        $habit = $habits->first(function (Arsenal $habit) use ($logs, $today, $yesterday, $user) {
            $timeline = $this->streaks->timeline($habit, $logs->get($habit->id, collect()), $today, $user->timezone);
            if (($timeline[$yesterday]['state'] ?? null) !== 'missed') {
                return false;
            }

            // The run of completed due days just before yesterday.
            $run = 0;
            foreach (array_reverse(array_filter($timeline, fn (string $date) => $date < $yesterday, ARRAY_FILTER_USE_KEY)) as $day) {
                if (! $day['due'] || $day['state'] === 'skipped') {
                    continue;
                }
                if ($day['state'] !== 'completed') {
                    break;
                }
                $run++;
            }

            return $run >= 3;
        });

        return $habit?->name;
    }
}
