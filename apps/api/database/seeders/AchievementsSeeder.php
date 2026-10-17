<?php

namespace Database\Seeders;

use App\Models\Achievement;
use Illuminate\Database\Seeder;

/**
 * Trophy definitions. Safe to re-run: rows are matched on `key`.
 *
 * `criteria` always has a `type` naming the stat to check, plus the
 * threshold for it (`count`, `days`, `minutes` or `level`). Optional
 * filters such as `priority` narrow the stat.
 */
class AchievementsSeeder extends Seeder
{
    private const XP = [
        'common' => 50,
        'rare' => 150,
        'epic' => 400,
        'legendary' => 1000,
    ];

    public function run(): void
    {
        foreach ($this->achievements() as [$key, $name, $description, $category, $rarity, $criteria]) {
            Achievement::updateOrCreate(['key' => $key], [
                'name' => $name,
                'description' => $description,
                'category' => $category,
                'rarity' => $rarity,
                'criteria' => $criteria,
                'xp_reward' => self::XP[$rarity],
            ]);
        }
    }

    /**
     * @return list<array{string, string, string, string, string, array<string, mixed>}>
     */
    private function achievements(): array
    {
        return [
            // Missions
            ['first_mission', 'First Patrol', 'Complete your first mission.', 'missions', 'common',
                ['type' => 'missions_completed', 'count' => 1]],
            ['missions_10', 'Night Shift', 'Complete 10 missions.', 'missions', 'common',
                ['type' => 'missions_completed', 'count' => 10]],
            ['missions_100', 'Protector of Gotham', 'Complete 100 missions.', 'missions', 'epic',
                ['type' => 'missions_completed', 'count' => 100]],
            ['missions_500', 'The Dark Knight', 'Complete 500 missions.', 'missions', 'legendary',
                ['type' => 'missions_completed', 'count' => 500]],
            ['critical_missions_5', 'Under Pressure', 'Complete 5 critical missions.', 'missions', 'rare',
                ['type' => 'missions_completed', 'priority' => 'critical', 'count' => 5]],
            ['no_postpone_20', 'No Excuses', 'Complete 20 missions without postponing them.', 'missions', 'rare',
                ['type' => 'missions_completed_without_postponing', 'count' => 20]],
            ['early_10', 'Before the Signal', 'Complete 10 missions before their due date.', 'missions', 'rare',
                ['type' => 'missions_completed_early', 'count' => 10]],
            ['clean_sweep_7', 'Clean Sweep', 'Finish every mission due that day, on 7 different days.', 'missions', 'rare',
                ['type' => 'days_all_missions_completed', 'count' => 7]],

            // Arsenal
            ['first_arsenal_log', 'Utility Belt', 'Check in on a habit for the first time.', 'arsenal', 'common',
                ['type' => 'arsenal_logs_completed', 'count' => 1]],
            ['streak_7', 'Week of Discipline', 'Reach a 7-day streak on any habit.', 'arsenal', 'common',
                ['type' => 'arsenal_streak', 'days' => 7]],
            ['streak_30', 'Creature of Habit', 'Reach a 30-day streak on any habit.', 'arsenal', 'rare',
                ['type' => 'arsenal_streak', 'days' => 30]],
            ['streak_100', 'Unbreakable', 'Reach a 100-day streak on any habit.', 'arsenal', 'epic',
                ['type' => 'arsenal_streak', 'days' => 100]],
            ['streak_365', 'A Year in the Cave', 'Reach a 365-day streak on any habit.', 'arsenal', 'legendary',
                ['type' => 'arsenal_streak', 'days' => 365]],
            ['full_arsenal_7', 'Fully Equipped', 'Complete every active habit in a day, on 7 different days.', 'arsenal', 'rare',
                ['type' => 'days_all_arsenal_completed', 'count' => 7]],
            ['comeback', 'Why Do We Fall?', 'Build a streak back to 7 days after breaking it.', 'arsenal', 'rare',
                ['type' => 'arsenal_streak_rebuilt', 'days' => 7]],

            // Intel
            ['first_intel', 'Case Notes', 'Write your first Intel entry.', 'intel', 'common',
                ['type' => 'intel_entries', 'count' => 1]],
            ['intel_streak_7', 'Nightly Debrief', 'Write Intel 7 days in a row.', 'intel', 'rare',
                ['type' => 'intel_streak', 'days' => 7]],
            ['intel_30', "Detective's Journal", 'Write 30 Intel entries.', 'intel', 'rare',
                ['type' => 'intel_entries', 'count' => 30]],
            ['gratitude_30', 'Thank You, Alfred', 'Record gratitude in 30 Intel entries.', 'intel', 'rare',
                ['type' => 'intel_with_gratitude', 'count' => 30]],
            ['intel_365', "World's Greatest Detective", 'Write 365 Intel entries.', 'intel', 'legendary',
                ['type' => 'intel_entries', 'count' => 365]],

            // Resources
            ['first_resource', 'Wayne Enterprises', 'Log your first transaction.', 'resources', 'common',
                ['type' => 'resources_logged', 'count' => 1]],
            ['tracked_90_days', 'Every Penny Counted', 'Log transactions on 90 different days.', 'resources', 'rare',
                ['type' => 'days_with_resources', 'count' => 90]],
            ['within_budget_1', 'Fiscal Discipline', 'Finish a month within every budget.', 'resources', 'rare',
                ['type' => 'months_within_budget', 'count' => 1]],
            ['within_budget_6', 'Lucius Approves', 'Finish 6 months within every budget.', 'resources', 'epic',
                ['type' => 'months_within_budget', 'count' => 6]],

            // Cases
            ['first_case', 'Case Closed', 'Complete your first case.', 'cases', 'common',
                ['type' => 'cases_completed', 'count' => 1]],
            ['milestones_25', 'Following the Trail', 'Complete 25 case milestones.', 'cases', 'rare',
                ['type' => 'milestones_completed', 'count' => 25]],
            ['cases_10', 'Cold Case Unit', 'Complete 10 cases.', 'cases', 'epic',
                ['type' => 'cases_completed', 'count' => 10]],

            // Focus
            ['first_focus', 'Into the Cave', 'Complete your first focus session.', 'focus', 'common',
                ['type' => 'focus_sessions_completed', 'count' => 1]],
            ['focus_day_4', 'Training Montage', 'Complete 4 focus sessions in one day.', 'focus', 'common',
                ['type' => 'focus_sessions_in_day', 'count' => 4]],
            ['focus_10_hours', 'Deep Work', 'Spend 10 hours in focus sessions.', 'focus', 'rare',
                ['type' => 'focus_minutes', 'minutes' => 600]],
            ['focus_100_hours', 'League of Shadows', 'Spend 100 hours in focus sessions.', 'focus', 'epic',
                ['type' => 'focus_minutes', 'minutes' => 6000]],

            // Alfred and progression
            ['onboarding', 'Welcome to the Cave', 'Finish setting up with Alfred.', 'alfred', 'common',
                ['type' => 'onboarding_completed']],
            ['alfred_actions_25', 'Master Wayne Listens', "Act on 25 of Alfred's suggestions.", 'alfred', 'rare',
                ['type' => 'alfred_actions_taken', 'count' => 25]],
            ['level_10', 'Rising Knight', 'Reach level 10.', 'progression', 'rare',
                ['type' => 'level_reached', 'level' => 10]],
            ['level_25', 'Caped Crusader', 'Reach level 25.', 'progression', 'epic',
                ['type' => 'level_reached', 'level' => 25]],
            ['level_50', 'Legend of Gotham', 'Reach level 50.', 'progression', 'legendary',
                ['type' => 'level_reached', 'level' => 50]],
        ];
    }
}
