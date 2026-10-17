<?php

namespace Database\Seeders;

use App\Models\Arsenal;
use App\Models\ArsenalLog;
use App\Models\CaseFile;
use App\Models\Mission;
use App\Models\User;
use App\Services\IntelSentiment;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Cache;

/**
 * A second demo account, graph@example.com / password, whose data makes the
 * Gotham Map tell a story: five cases with their missions, a dependency or
 * two, habits linked to good days in Intel, and a few avoided missions with
 * no connections at all. Re-running it resets that account.
 *
 * Streaks are computed from the logs below, as everywhere in Gotham.
 */
class GraphDemoSeeder extends Seeder
{
    public const EMAIL = 'graph@example.com';

    public function run(IntelSentiment $sentiment): void
    {
        $user = User::firstOrCreate(
            ['email' => self::EMAIL],
            User::factory()->make(['name' => 'Bruce Wayne'])->only(['name', 'password', 'email_verified_at']),
        );
        $user->update(['onboarding_completed' => true, 'current_mode' => 'bruce', 'timezone' => 'UTC', 'work_start_time' => '09:00', 'work_end_time' => '18:00']);

        $user->missions()->withTrashed()->forceDelete();
        $user->cases()->withTrashed()->forceDelete();
        $user->arsenal()->withTrashed()->forceDelete();
        $user->focusSessions()->delete();
        $user->intel()->delete();
        $user->alfredMessages()->delete();
        $user->systemIntelligence()->delete();
        Cache::forget("alfred-insights:{$user->id}");

        $today = $user->today();
        $day = fn (int $offset) => $today->addDays($offset)->toDateString();

        // [name, status, progress, colour preset (null is gold), description]
        $cases = [];
        foreach ([
            ['Website Launch', 'active', 45, null, 'The new site, live before the end of the quarter.'],
            ['Learn TypeScript', 'active', 20, 'blue', 'Types everywhere, and fewer surprises at runtime.'],
            ['Health & Fitness Q4', 'active', 60, 'teal', 'A 5K by December and a body that keeps up.'],
            ['Freelance Client — ABC Corp', 'on_hold', 30, 'red', 'Waiting on their feedback before the next round.'],
            ['Personal Finance Overhaul', 'planning', 0, 'purple', 'A budget that holds, and savings that grow.'],
        ] as [$name, $status, $progress, $color, $description]) {
            $cases[$name] = CaseFile::factory()->for($user)->create([
                'name' => $name,
                'description' => $description,
                'status' => $status,
                'color' => $color,
                'progress_mode' => 'manual',
                'progress' => $progress,
                'start_date' => $day(-45),
                'target_end_date' => $day(45),
            ]);
        }

        // [title, priority, status, times postponed, case, due in days]
        $missions = [];
        foreach ([
            ['Design homepage mockup', 'high', 'completed', 0, 'Website Launch', -6],
            ['Write copy for about page', 'medium', 'not_started', 4, 'Website Launch', -1],
            ['Set up hosting on Render', 'high', 'in_progress', 0, 'Website Launch', 1],
            ['Configure domain and SSL', 'critical', 'not_started', 0, 'Website Launch', 3],
            ['SEO meta tags audit', 'low', 'not_started', 0, 'Website Launch', 10],
            ['Launch announcement post', 'medium', 'not_started', 0, 'Website Launch', 14],
            ['Complete TypeScript handbook', 'medium', 'in_progress', 0, 'Learn TypeScript', 5],
            ['Refactor one existing project', 'high', 'not_started', 2, 'Learn TypeScript', 2],
            ['Build a small TS utility library', 'high', 'not_started', 0, 'Learn TypeScript', 12],
            ['Read Effective TypeScript book', 'low', 'not_started', 0, 'Learn TypeScript', 20],
            ['Sign up for 5K race', 'medium', 'completed', 0, 'Health & Fitness Q4', -10],
            ['Schedule annual checkup', 'high', 'not_started', 5, 'Health & Fitness Q4', -2],
            ['Meal prep Sunday routine', 'medium', 'in_progress', 0, 'Health & Fitness Q4', 0],
            ['Discovery call with client', 'critical', 'completed', 0, 'Freelance Client — ABC Corp', -20],
            ['Deliver wireframes', 'high', 'not_started', 0, 'Freelance Client — ABC Corp', 4],
            ['Revision round 1', 'medium', 'not_started', 0, 'Freelance Client — ABC Corp', 9],
            ['Final delivery', 'high', 'not_started', 0, 'Freelance Client — ABC Corp', 16],
            // No case: the isolated ones.
            ['Call dentist for appointment', 'medium', 'not_started', 6, null, -3],
            ['Renew car insurance', 'high', 'not_started', 3, null, 0],
            ["Reply to mom's email", 'low', 'not_started', 2, null, 1],
        ] as [$title, $priority, $status, $postponed, $case, $due]) {
            $missions[$title] = Mission::factory()->for($user)->create([
                'title' => $title,
                'description' => null,
                'why_it_matters' => $this->why($title),
                'priority' => $priority,
                'status' => $status,
                'times_postponed' => $postponed,
                'case_id' => $case === null ? null : $cases[$case]->id,
                'due_date' => $day($due),
                'completed_at' => $status === 'completed' ? $today->addDays($due)->setTime(16, 0)->utc() : null,
                'past_self_message' => $title === 'Call dentist for appointment' ? 'The tooth will not fix itself. Five minutes on the phone.' : null,
            ]);
        }

        $missions['Configure domain and SSL']->dependencies()->attach($missions['Set up hosting on Render']->id);
        $missions['Final delivery']->dependencies()->attach($missions['Revision round 1']->id);

        // [name, category, type, frequency, target, unit, days ago completed]
        $habits = [
            ['Morning Exercise', 'health', 'daily', null, null, null, [1, 2, 5, 6, 7, 8, 12, 13, 14]],
            ['Read 30 Minutes', 'learning', 'daily', null, null, null, [1, 2, 6, 7, 8, 13, 14]],
            ['Journal Entry', 'mental', 'daily', null, null, null, [1, 2, 3, 5, 6, 7, 8, 9, 12, 13, 14]],
            ['Drink 8 Glasses Water', 'health', 'measurable', null, 8, 'glasses', [1, 2, 3]],
            ['No Social Media Before 10am', 'productivity', 'daily', null, null, null, range(1, 15)],
            ['Weekly Review', 'productivity', 'specific_days', ['days' => [7]], null, null, $this->lastSundays($today, 4)],
            // The broken streak: done a fortnight ago, not since.
            ['Cold Shower', 'health', 'daily', null, null, null, [13, 14]],
            ['Gratitude Practice', 'mental', 'daily', null, null, null, [1, 2]],
        ];

        foreach ($habits as [$name, $category, $type, $frequency, $target, $unit, $doneDaysAgo]) {
            $habit = Arsenal::factory()->for($user)->create([
                'name' => $name,
                'description' => null,
                'category' => $category,
                'type' => $type,
                'frequency' => $frequency ?? [],
                'target_value' => $target,
                'unit' => $unit,
                'reminder_time' => null,
                'mode_specific' => [],
                'active' => true,
                'created_at' => $today->subDays(30)->utc(),
            ]);

            foreach ($doneDaysAgo as $daysAgo) {
                ArsenalLog::create([
                    'arsenal_id' => $habit->id,
                    'user_id' => $user->id,
                    'date' => $today->subDays($daysAgo)->toDateString(),
                    'completed' => true,
                    'value' => $target,
                    'completed_at' => $today->subDays($daysAgo)->setTime(7, 30)->utc(),
                ]);
            }
        }

        // [days ago, mood, energy, stress, text]
        foreach ([
            [1, 'great', 8, 3, 'Ran before sunrise and read on the train. Clear head all day.'],
            [2, 'good', 7, 4, 'Steady progress on the hosting setup. A good day.'],
            [3, 'okay', 5, 6, 'Busy, scattered. Wrote a little, did not move much.'],
            [4, 'bad', 4, 8, 'Skipped the run. Stressed about the client and tired all day.'],
            [5, 'okay', 6, 5, 'Better. Back to the routine, slowly.'],
            [6, 'great', 9, 2, 'Everything clicked. Exercise, reading, deep work. Grateful.'],
            [7, 'good', 7, 4, 'Finished the homepage mockup draft. Happy with it.'],
            [8, 'great', 8, 3, 'Long focus session on TypeScript. Energised.'],
            [9, 'terrible', 3, 9, 'Exhausted and anxious. Nothing went right today.'],
            [10, 'bad', 4, 7, 'Still drained. Postponed the checkup again.'],
            [11, 'okay', 6, 5, 'Quiet day. Caught up on email.'],
            [12, 'good', 7, 4, 'Meal prep done. Morning workout felt strong.'],
            [13, 'great', 8, 2, 'Cold shower, run, a chapter of the handbook. Proud of today.'],
            [14, 'good', 7, 3, 'Signed up for the 5K. Feeling motivated.'],
        ] as [$daysAgo, $mood, $energy, $stress, $text]) {
            $score = $sentiment->analyze($text);
            $user->intel()->create([
                'date' => $today->subDays($daysAgo)->toDateString(),
                'content' => "<p>{$text}</p>",
                'mood' => $mood,
                'energy_level' => $energy,
                'stress_level' => $stress,
                'sentiment' => $score['score'],
                'sentiment_label' => $score['label'],
            ]);
        }

        // [mission, minutes, completed, days ago, energy before, energy after]
        foreach ([
            ['Design homepage mockup', 50, true, 7, 7, 8],
            ['Set up hosting on Render', 25, true, 2, 6, 7],
            ['Complete TypeScript handbook', 75, true, 8, 8, 6],
            ['Meal prep Sunday routine', 25, true, 5, null, null],
            ['Deliver wireframes', 25, false, 4, null, null],
            ['Design homepage mockup', 50, true, 6, null, null],
            ['Complete TypeScript handbook', 25, true, 3, null, null],
            ['Refactor one existing project', 25, false, 3, null, null],
            ['Write copy for about page', 25, false, 2, null, null],
            ['Read Effective TypeScript book', 25, true, 1, null, null],
        ] as $index => [$title, $minutes, $completed, $daysAgo, $before, $after]) {
            $start = $today->subDays($daysAgo)->setTime(9 + $index % 6, 0)->utc();
            $user->focusSessions()->create([
                'mission_id' => $missions[$title]->id,
                'start_time' => $start,
                // Given-up sessions ended early.
                'end_time' => $start->addMinutes($completed ? $minutes : 8),
                'duration_minutes' => $minutes,
                'completed' => $completed,
                'energy_before' => $before,
                'energy_after' => $after,
            ]);
        }
    }

    private function why(string $title): string
    {
        return match (true) {
            str_contains($title, 'dentist') => 'The tooth has been aching for weeks, sir.',
            str_contains($title, 'insurance') => 'Driving uninsured is a risk Gotham cannot afford.',
            str_contains($title, 'mom') => 'She asked a simple question. She deserves an answer.',
            default => "'{$title}' moves the work forward.",
        };
    }

    /** Days ago of the last `$count` Sundays before today. @return list<int> */
    private function lastSundays(CarbonImmutable $today, int $count): array
    {
        $first = $today->dayOfWeekIso === 7 ? 7 : $today->dayOfWeekIso;

        return array_map(fn (int $week) => $first + 7 * $week, range(0, $count - 1));
    }
}
