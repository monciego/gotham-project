<?php

namespace Database\Seeders;

use App\Models\AlfredMessage;
use App\Models\Arsenal;
use App\Models\ArsenalLog;
use App\Models\CaseFile;
use App\Models\FocusSession;
use App\Models\Intel;
use App\Models\Mission;
use App\Models\Operation;
use App\Models\Resource;
use App\Models\User;
use App\Services\AchievementService;
use App\Services\AlfredService;
use App\Services\ArsenalStreaks;
use App\Services\CaseProgress;
use App\Services\IntelSentiment;
use App\Services\RecurringResources;
use App\Services\ReportService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Cache;

/**
 * Sample data for the local test user, so HQ has something to show.
 * Re-running it resets that user: XP, trophies, missions, habits, focus sessions, Intel,
 * Resources (transactions, budgets, savings goals), Operations, Cases, Overview's
 * history (60 days of missions, focus and runs, weekly reports, insights), the XP
 * ledger, trophies the history earns, and messages.
 */
class DemoSeeder extends Seeder
{
    public function run(ArsenalStreaks $streaks, IntelSentiment $sentiment, RecurringResources $recurring, CaseProgress $caseProgress, ReportService $reports, AchievementService $achievements): void
    {
        $user = User::where('email', 'test@example.com')->firstOrFail();
        $user->update(['name' => 'Bruce Wayne', 'work_start_time' => '08:00', 'work_end_time' => '18:00']);
        $user->forceFill(['total_xp' => 0, 'current_level' => 1])->save();
        $user->achievements()->detach();

        $user->missions()->withTrashed()->forceDelete();
        $user->cases()->withTrashed()->forceDelete();
        $user->arsenal()->withTrashed()->forceDelete();
        $user->focusSessions()->delete();
        $user->alfredMessages()->delete();
        $user->intel()->delete();
        $user->resources()->delete();
        $user->budgets()->delete();
        $user->savingsGoals()->delete();
        $user->operations()->delete();
        $user->weeklyReports()->delete();
        $user->xpEvents()->delete();
        $user->activityDays()->delete();
        $user->systemIntelligence()->delete();
        Cache::forget("alfred-insights:{$user->id}");

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

        // Cases: [name, category, status, started (days ago), target (days ahead), mode, color, missions by title,
        // earlier missions already done (days ago), [days ago => progress] history]
        $cases = [
            ['Wayne Enterprises Q4 turnaround', 'Business', 'active', 28, 45, 'auto', 'blue',
                ['Finish the quarterly report', 'Call Lucius about the R&D budget'],
                ['Draft the Q4 targets' => 20, 'Meet the division heads' => 12], [21 => 0, 20 => 33, 12 => 50]],
            ['Wayne Foundation grants', 'Philanthropy', 'active', 30, 4, 'auto', 'teal',
                ['Review Wayne Foundation grant applications'], [], [30 => 0]],
            ['Arkham security overhaul', 'Gotham', 'on_hold', 40, 60, 'manual', 'purple', ['Read the Arkham security audit'], [], [40 => 0, 30 => 20, 14 => 40]],
            ['Rebuild the Batcave', 'Personal', 'planning', 0, null, 'auto', 'gray', [], [], []],
            ['The Falcone investigation', 'Gotham', 'completed', 90, null, 'auto', 'red', [],
                ['Trace the shipping manifests' => 70, 'Turn Carmine Falcone in' => 50], [90 => 0, 70 => 50, 50 => 100]],
        ];

        foreach ($cases as [$name, $category, $status, $startedAgo, $targetAhead, $mode, $color, $linked, $earlier, $history]) {
            $case = $user->cases()->create([
                'name' => $name,
                'category' => $category,
                'status' => $status,
                'start_date' => $today->subDays($startedAgo)->toDateString(),
                'target_end_date' => $targetAhead === null ? null : $today->addDays($targetAhead)->toDateString(),
                'actual_end_date' => $status === 'completed' ? $today->subDays(50)->toDateString() : null,
                'progress_mode' => $mode,
                'progress' => $mode === 'manual' ? 40 : 0,
                'color' => $color,
                'tags' => [strtolower($category)],
                'description' => "Everything it takes to see {$name} through.",
                'notes' => '<p>Alfred keeps the case file here.</p><ul><li><p>Who is involved</p></li><li><p>What we know</p></li></ul>',
            ]);
            $case->forceFill(['xp_awarded' => $status === 'completed' ? CaseFile::XP : 0])->save();

            $user->missions()->whereIn('title', $linked)->update(['case_id' => $case->id]);
            foreach ($earlier as $title => $daysAgo) {
                Mission::factory()->for($user)->create([
                    'case_id' => $case->id,
                    'title' => $title,
                    'status' => 'completed',
                    'due_date' => $today->subDays($daysAgo)->toDateString(),
                    'completed_at' => $today->subDays($daysAgo)->addHours(15)->utc(),
                    'created_at' => $today->subDays($startedAgo)->utc(),
                ]);
            }

            foreach ($history as $daysAgo => $progress) {
                $case->progressLogs()->create(['date' => $today->subDays($daysAgo)->toDateString(), 'progress' => $progress]);
            }

            $caseProgress->recalculate($case);
            $caseProgress->snapshot($case);
            // Celebrations already happened in the story; don't fill HQ with them.
            $user->alfredMessages()->where('title', 'like', "{$name}:%")->delete();
        }

        $user->cases()->where('name', 'Wayne Foundation grants')->first()->milestones()->createMany([
            ['name' => 'Shortlist applicants', 'target_date' => $today->subDays(10)->toDateString(), 'completed' => true, 'completed_at' => $today->subDays(11)->utc()],
            ['name' => 'Board vote', 'target_date' => $today->addDays(4)->toDateString()],
        ]);
        $user->cases()->where('name', 'Wayne Enterprises Q4 turnaround')->first()->milestones()->createMany([
            ['name' => 'Q4 targets signed off', 'target_date' => $today->subDays(18)->toDateString(), 'completed' => true, 'completed_at' => $today->subDays(19)->utc()],
            ['name' => 'Quarterly report to the board', 'target_date' => $today->addDays(3)->toDateString()],
            ['name' => 'Year-end review', 'target_date' => $today->addDays(45)->toDateString()],
        ]);

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
                'reminder_time' => ['Morning run' => '06:30', 'Meditate' => '21:00', 'Strength training' => '18:00'][$name] ?? null,
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

        // Overview's history: 60 days of runs, completed missions and focus sessions, with
        // more missions on days with a run and more energy in morning sessions, so the
        // charts have shape and Alfred has patterns to find. Seeded for repeatable output.
        mt_srand(1007);
        $run = $user->arsenal()->where('name', 'Morning run')->first();
        $pool = ['Answer the board\'s questions', 'Sign the Applied Sciences contracts', 'Review the Narrows housing plan',
            'Inspect the Batmobile', 'Prepare the charity brief', 'Calibrate the cowl sensors', 'Update the rogues gallery files',
            'Plan the Gotham General donation', 'Meet with Commissioner Gordon', 'Patch the Batcave network'];

        for ($daysAgo = 60; $daysAgo >= 2; $daysAgo--) {
            $day = $today->subDays($daysAgo);
            // Days 1-6 are already run (the current streak); day 7 stays missed so it ends there.
            $ran = $daysAgo <= 6 || ($daysAgo > 7 && mt_rand(1, 100) <= 65);
            if ($ran && $daysAgo > 6) {
                ArsenalLog::create([
                    'arsenal_id' => $run->id, 'user_id' => $user->id, 'date' => $day->toDateString(),
                    'completed' => true, 'completed_at' => $day->setTime(6, 40)->utc(),
                ]);
            }

            $weekend = $day->isWeekend();
            $count = max(0, mt_rand(0, $weekend ? 1 : 2) + ($ran ? mt_rand(1, 2) : 0));
            for ($index = 0; $index < $count; $index++) {
                $priority = ['high', 'medium', 'medium', 'low'][mt_rand(0, 3)];
                $mission = Mission::factory()->for($user)->create([
                    'title' => $pool[mt_rand(0, count($pool) - 1)],
                    'priority' => $priority,
                    'status' => 'completed',
                    'due_date' => $day->toDateString(),
                    // Friday's missions slip the most.
                    'times_postponed' => $day->dayOfWeekIso === 5 ? mt_rand(1, 3) : (mt_rand(1, 100) <= 15 ? 1 : 0),
                    'completed_at' => $day->setTime(mt_rand(10, 18), mt_rand(0, 59))->utc(),
                    'created_at' => $day->subDays(3)->utc(),
                ]);
                $mission->forceFill(['xp_awarded' => Mission::XP[$priority]])->save();
            }

            // Focus follows the missions; mornings start with more energy.
            foreach (array_slice([9, 14, 16], 0, $weekend ? min(1, $count) : min(3, $count)) as $hour) {
                $minutes = [25, 50][mt_rand(0, 1)];
                $startTime = $day->setTime($hour, 0)->utc();
                FocusSession::factory()->for($user)->create([
                    'start_time' => $startTime,
                    'end_time' => $startTime->addMinutes($minutes),
                    'duration_minutes' => $minutes,
                    'energy_before' => $hour === 9 ? mt_rand(8, 9) : mt_rand(5, 7),
                    'xp_awarded' => intdiv($minutes, 25) * 5,
                ]);
            }
        }
        $streaks->refresh($run, $user);
        // The history's XP, replayed in order into the ledger so levels and the XP history line up.
        $earnings = $user->missions()->where('xp_awarded', '>', 0)->get()
            ->map(fn (Mission $mission) => [$mission->completed_at, $mission->xp_awarded, 'mission_complete', $mission->title])
            ->merge($user->focusSessions()->where('xp_awarded', '>', 0)->get()
                ->map(fn (FocusSession $session) => [$session->start_time, $session->xp_awarded, 'focus_complete', "{$session->duration_minutes}-minute focus session"]))
            ->sortBy(fn (array $earning) => $earning[0]->timestamp);
        foreach ($earnings as [$at, $amount, $reason, $label]) {
            $before = $user->current_level;
            $user->gainXp($amount);
            $user->xpEvents()->create([
                'amount' => $amount, 'reason' => $reason, 'label' => $label,
                'total_after' => $user->total_xp, 'level_before' => $before, 'level_after' => $user->current_level,
            ])->forceFill(['created_at' => $at])->save();
        }
        // Opened the app every day for the last 12 days.
        foreach (range(12, 1) as $daysAgo) {
            $user->activityDays()->create(['date' => $today->subDays($daysAgo)->toDateString()]);
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

        // Operations: this week's calendar, in the user's timezone.
        $at = fn (int $days, string $time) => $today->addDays($days)->setTimeFromTimeString($time)->utc();
        $quarterly = $user->missions()->where('title', 'Finish the quarterly report')->first();
        foreach ([
            ['Board meeting', 1, '14:00', '15:30', 'work', 'blue', null, null],
            ['Lunch with Lucius', 2, '12:30', '13:30', 'work', 'purple', null, null],
            ['Dinner with Selina', 3, '19:30', '21:30', 'social', 'pink', null, null],
            ['Training with Dick', -6, '07:00', '08:00', 'health', 'teal', ['freq' => 'weekly', 'until' => null], null],
            ['Wayne Foundation review', 0, '16:00', '17:00', 'work', 'gray', null, null],
        ] as [$title, $days, $from, $to, $category, $color, $rule, $mission]) {
            $user->operations()->create([
                'title' => $title, 'start_time' => $at($days, $from), 'end_time' => $at($days, $to),
                'category' => $category, 'color' => $color, 'recurring' => $rule !== null, 'recurring_rule' => $rule,
                'mission_id' => $mission,
            ]);
        }
        $user->operations()->create([
            'title' => 'Wayne Foundation gala', 'all_day' => true, 'category' => 'social', 'color' => 'red',
            'start_time' => $today->addDays(5)->utc(), 'end_time' => $today->addDays(6)->utc(),
        ]);
        $block = $user->operations()->make([
            'title' => Operation::FOCUS_BLOCK_TITLE, 'start_time' => $at(1, '09:00'), 'end_time' => $at(1, '11:00'),
            'category' => 'work', 'mission_id' => $quarterly?->id,
        ]);
        $block->kind = 'focus_block';
        $block->save();

        // Trophies the history has earned. Their messages would bury HQ, so they're cleared.
        $achievements->checkAndAward($user, 'all');
        $user->alfredMessages()
            ->where(fn ($query) => $query->where('type', 'achievement_unlocked')->orWhere('title', 'like', 'Level %, sir.'))
            ->delete();

        // Four weeks of saved reports for "View previous reports".
        foreach (range(4, 1) as $weeksAgo) {
            $reports->store($user, $today->subWeeks($weeksAgo));
        }

        // The quarterly report has slipped three times: Alfred's panel, as the hourly rounds would send it.
        app(AlfredService::class)->sendMessage($user, 'task_avoidance', [
            'title' => $quarterly->title,
            'count' => $quarterly->times_postponed,
            'mission_id' => $quarterly->id,
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
