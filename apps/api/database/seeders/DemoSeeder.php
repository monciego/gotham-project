<?php

namespace Database\Seeders;

use App\Models\AlfredMessage;
use App\Models\Arsenal;
use App\Models\ArsenalLog;
use App\Models\FocusSession;
use App\Models\Intel;
use App\Models\Mission;
use App\Models\Resource;
use App\Models\User;
use App\Services\ArsenalStreaks;
use App\Services\IntelSentiment;
use App\Services\RecurringResources;
use Illuminate\Database\Seeder;

/**
 * Sample data for the local test user, so HQ has something to show.
 * Re-running it resets that user: XP, trophies, missions, habits, focus sessions, Intel,
 * Resources (transactions, budgets, savings goals) and messages.
 */
class DemoSeeder extends Seeder
{
    public function run(ArsenalStreaks $streaks, IntelSentiment $sentiment, RecurringResources $recurring): void
    {
        $user = User::where('email', 'test@example.com')->firstOrFail();
        $user->update(['name' => 'Bruce Wayne']);
        $user->forceFill(['total_xp' => 0, 'current_level' => 1])->save();
        $user->achievements()->detach();

        $user->missions()->withTrashed()->forceDelete();
        $user->arsenal()->withTrashed()->forceDelete();
        $user->focusSessions()->delete();
        $user->alfredMessages()->delete();
        $user->intel()->delete();
        $user->resources()->delete();
        $user->budgets()->delete();
        $user->savingsGoals()->delete();

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

        // [name, category, type, frequency, target, unit, days completed before today (1 = yesterday)]
        $habits = [
            ['Morning run', 'physical', 'daily', [], null, null, range(1, 6)],
            ['No phone after 10pm', 'mental', 'yes_no', [], null, null, range(1, 29)],
            ['Read', 'learning', 'measurable', [], 20, 'pages', range(1, 12)],
            ['Meditate', 'mental', 'daily', [], null, null, [3, 4, 5]],
            ['Strength training', 'physical', 'specific_days', ['days' => [1, 3, 5]], null, null, [2, 4, 7, 9]],
        ];

        foreach ($habits as [$name, $category, $type, $frequency, $target, $unit, $doneDaysAgo]) {
            $habit = Arsenal::factory()->for($user)->create([
                'name' => $name,
                'category' => $category,
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

        // [days ago, mood, energy, stress, content, gratitude, wins, struggles, tags]. Today is left unwritten.
        $journal = [
            [13, 'good', 7, 4, 'Productive morning at the office. Lucius walked me through the new cowl prototype.', 'Lucius, patient as ever.', 'Finished the R&D review.', null, ['work']],
            [12, 'okay', 5, 6, 'Long board meeting. Nothing decided, everything discussed.', null, null, 'Staying awake through the budget slides.', ['work']],
            [11, 'great', 8, 3, 'A great patrol. Quiet streets, and I was proud of how calm I stayed.', 'Clear skies over Gotham.', 'Morning run before sunrise.', null, ['training', 'patrol']],
            [9, 'bad', 4, 8, 'Stressed about the foundation audit. Slept badly and felt anxious all day.', null, null, 'Could not switch off.', ['work', 'sleep']],
            [8, 'okay', 5, 6, 'Better. Got through the audit paperwork with Alfred.', 'Alfred and his tea.', 'Audit documents filed.', null, ['work']],
            [7, 'good', 7, 4, 'Training went well. Grateful for the rest day tomorrow.', 'Rest days.', 'New personal best on the bar.', null, ['training']],
            [5, 'great', 9, 2, 'Excellent day. Accomplished everything on the list and still made dinner.', 'Dinner with Selina.', 'Every mission closed.', null, ['family']],
            [4, 'good', 7, 4, 'Steady day. Read twenty pages and meditated.', null, 'Kept every habit.', null, ['reading']],
            [3, 'okay', 6, 5, 'A quiet day, mostly emails.', null, null, 'Too much screen time.', ['work']],
            [2, 'good', 7, 3, 'Happy with the progress on the quarterly report, finally.', 'A quiet evening.', 'First draft of the report.', null, ['work']],
            [1, 'okay', 4, 6, 'Tired. Pushed the report back again.', null, null, 'Procrastinating on the report.', ['work', 'sleep']],
        ];

        foreach ($journal as [$daysAgo, $mood, $energy, $stress, $content, $gratitude, $wins, $struggles, $tags]) {
            $score = $sentiment->analyze($content);
            $user->intel()->create([
                'date' => $today->subDays($daysAgo)->toDateString(),
                'content' => "<p>{$content}</p>",
                'mood' => $mood,
                'energy_level' => $energy,
                'stress_level' => $stress,
                'gratitude' => $gratitude,
                'wins' => $wins,
                'struggles' => $struggles,
                'tags' => $tags,
                'sentiment' => $score['score'],
                'sentiment_label' => $score['label'],
            ]);
        }

        // Resources: four months of history. Salary and rent recur, so their copies come from the recurring service.
        $thisMonth = $today->startOfMonth();
        foreach ([
            ['income', 6000, 'Salary', 'Wayne Enterprises', 'Checking'],
            ['expense', 1800, 'Housing', 'Penthouse upkeep', 'Checking'],
            ['expense', 15.99, 'Subscriptions', 'Gotham Gazette', 'Visa'],
        ] as [$type, $amount, $category, $description, $account]) {
            $recurring->generate($user->resources()->create([
                'type' => $type, 'amount' => $amount, 'category' => $category, 'description' => $description,
                'account' => $account, 'date' => $thisMonth->subMonths(3)->toDateString(),
                'recurring' => true, 'recurring_frequency' => 'monthly',
            ]));
        }

        // [day of month, category, amount, description] repeated each month, scaled a little per month.
        $spending = [
            [3, 'Food', 142.30, 'Groceries'], [9, 'Food', 96.40, 'Dinner with Selina'], [14, 'Food', 188.75, 'Groceries'],
            [5, 'Transport', 60, 'Fuel'], [12, 'Transport', 45.50, 'Train pass'],
            [7, 'Utilities', 180.20, 'Electricity'], [10, 'Entertainment', 85, 'Opera tickets'],
            [11, 'Shopping', 210, 'New suit'], [15, 'Health', 40, 'Pharmacy'],
        ];
        foreach (range(3, 0) as $monthsAgo) {
            $month = $thisMonth->subMonths($monthsAgo);
            foreach ($spending as [$day, $category, $amount, $description]) {
                $date = $month->addDays($day - 1);
                if ($date->gt($today)) {
                    continue;
                }
                $user->resources()->create([
                    'type' => 'expense', 'amount' => round($amount * (1 + $monthsAgo * 0.05), 2), 'category' => $category,
                    'description' => $description, 'date' => $date->toDateString(), 'account' => 'Visa',
                ]);
            }
        }
        $user->resources()->create(['type' => 'income', 'amount' => 750, 'category' => 'Freelance', 'description' => 'Consulting for Lucius', 'date' => $today->subDays(4)->toDateString(), 'account' => 'Checking']);

        foreach (['Food' => 450, 'Transport' => 150, 'Entertainment' => 150, 'Shopping' => 200, 'Subscriptions' => 30, 'Utilities' => 250] as $category => $limit) {
            $user->budgets()->create(['category' => $category, 'monthly_limit' => $limit, 'month' => $thisMonth->toDateString()]);
        }

        foreach ([
            ['Batmobile tyres', 5000, $today->addDays(90), [800, 700]],
            ['Emergency fund', 10000, null, [2000, 1000]],
            ['Watchtower telescope', 800, null, [500, 300]],
        ] as [$name, $target, $deadline, $contributions]) {
            $goal = $user->savingsGoals()->create(['name' => $name, 'target_amount' => $target, 'deadline' => $deadline?->toDateString()]);
            $goal->forceFill(['created_at' => $today->subDays(30)->utc()])->save();
            foreach ($contributions as $index => $amount) {
                $contribution = $user->resources()->make([
                    'type' => 'expense', 'amount' => $amount, 'category' => Resource::SAVINGS_CATEGORY,
                    'description' => "Toward {$name}", 'date' => $today->subDays(20 - $index * 10)->toDateString(), 'account' => 'Savings',
                ]);
                $contribution->savings_goal_id = $goal->id;
                $contribution->save();
            }
            $goal->recalculate();
        }

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
