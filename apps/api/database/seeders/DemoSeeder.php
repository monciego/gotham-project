<?php

namespace Database\Seeders;

use App\Models\AlfredMessage;
use App\Models\Arsenal;
use App\Models\ArsenalLog;
use App\Models\FocusSession;
use App\Models\Mission;
use App\Models\User;
use App\Services\ArsenalStreaks;
use Illuminate\Database\Seeder;

/**
 * Sample data for the local test user, so HQ has something to show.
 * Re-running it replaces that user's missions, habits, focus sessions and messages.
 */
class DemoSeeder extends Seeder
{
    public function run(ArsenalStreaks $streaks): void
    {
        $user = User::where('email', 'test@example.com')->firstOrFail();
        $user->update(['name' => 'Bruce Wayne']);

        $user->missions()->withTrashed()->forceDelete();
        $user->arsenal()->delete();
        $user->focusSessions()->delete();
        $user->alfredMessages()->delete();

        $today = $user->today();

        $missions = [
            ['Finish the quarterly report', 'critical', -1, 3, 'not_started', 'The board meets Friday. Lucius is counting on you.'],
            ['Call Lucius about the R&D budget', 'high', 0, 1, 'not_started', 'Applied Sciences stalls without it.'],
            ['Review Wayne Foundation grant applications', 'medium', 0, 0, 'in_progress', 'Forty families are waiting on these decisions.'],
            ['Plan Tuesday training session', 'medium', 0, 0, 'not_started', 'Discipline is built in the planning.'],
            ['Book the dentist', 'low', 0, 2, 'not_started', 'Small things left undone become big things.'],
            ['Reply to Selina', 'medium', 0, 0, 'completed', 'Some conversations should not wait.'],
            ['Read the Arkham security audit', 'low', 1, 0, 'not_started', 'Know where the walls are weak.'],
        ];

        foreach ($missions as [$title, $priority, $dayOffset, $postponed, $status, $why]) {
            Mission::factory()->for($user)->create([
                'title' => $title,
                'priority' => $priority,
                'due_date' => $today->addDays($dayOffset)->toDateString(),
                'times_postponed' => $postponed,
                'status' => $status,
                'why_it_matters' => $why,
                'completed_at' => $status === 'completed' ? now() : null,
            ]);
        }

        // [name, type, frequency, target, unit, days completed before today (1 = yesterday)]
        $habits = [
            ['Morning run', 'daily', [], null, null, range(1, 6)],
            ['No phone after 10pm', 'yes_no', [], null, null, range(1, 29)],
            ['Read', 'measurable', [], 20, 'pages', range(1, 12)],
            ['Meditate', 'daily', [], null, null, [2, 3, 4]],
            ['Strength training', 'specific_days', ['days' => [1, 3, 5]], null, null, [2, 4, 7, 9]],
        ];

        foreach ($habits as [$name, $type, $frequency, $target, $unit, $doneDaysAgo]) {
            $habit = Arsenal::factory()->for($user)->create([
                'name' => $name,
                'category' => 'training',
                'type' => $type,
                'frequency' => $frequency,
                'target_value' => $target,
                'unit' => $unit,
                'created_at' => $today->subDays(60)->utc(),
            ]);

            foreach ($doneDaysAgo as $daysAgo) {
                ArsenalLog::create([
                    'arsenal_id' => $habit->id,
                    'user_id' => $user->id,
                    'date' => $today->subDays($daysAgo)->toDateString(),
                    'completed' => true,
                    'value' => $target,
                    'completed_at' => $today->subDays($daysAgo)->addHours(8)->utc(),
                ]);
            }

            $streaks->refresh($habit, $user);
        }

        // 95 minutes of focus so far today.
        $start = $today->utc()->max(now()->toImmutable()->subMinutes(150));
        FocusSession::factory()->for($user)->create([
            'start_time' => $start,
            'end_time' => $start->addMinutes(50),
            'duration_minutes' => 50,
        ]);
        FocusSession::factory()->for($user)->create([
            'start_time' => $start->addMinutes(60),
            'end_time' => $start->addMinutes(105),
            'duration_minutes' => 45,
        ]);

        AlfredMessage::factory()->for($user)->create([
            'priority' => 'critical',
            'mood' => 'concerned',
            'title' => 'The quarterly report, sir.',
            'message' => "You've postponed it three times now. I've cleared your morning. Shall we begin?",
            'actions' => [['label' => 'Show me', 'href' => '/missions']],
            'requires_action' => true,
        ]);
        AlfredMessage::factory()->for($user)->create([
            'priority' => 'medium',
            'mood' => 'encouraging',
            'title' => 'Six mornings running, sir.',
            'message' => 'One more run today and the streak reaches a full week.',
        ]);
        AlfredMessage::factory()->for($user)->create([
            'priority' => 'low',
            'mood' => 'proud',
            'title' => "Yesterday's work",
            'message' => 'You kept every promise you made yesterday. Gotham noticed.',
        ]);
    }
}
