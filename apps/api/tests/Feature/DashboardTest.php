<?php

namespace Tests\Feature;

use App\Models\Arsenal;
use App\Models\ArsenalLog;
use App\Models\FocusSession;
use App\Models\Mission;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        // 09:00 on 17 October in Manila (UTC+8).
        $this->travelTo('2026-10-17 01:00:00');
        $this->user = User::factory()->create(['name' => 'Bruce Wayne', 'timezone' => 'Asia/Manila']);
    }

    public function test_it_requires_authentication(): void
    {
        $this->getJson('/api/v1/dashboard')->assertUnauthorized();
    }

    public function test_greeting_uses_the_users_timezone(): void
    {
        $this->dashboard()->assertJsonPath('data.morning_brief.greeting', 'Good morning, Bruce.');

        // 04:00 on the 18th in Manila.
        $this->travelTo('2026-10-17 20:00:00');
        $this->dashboard()->assertJsonPath('data.morning_brief.greeting', 'Working late, Bruce?');
    }

    public function test_brief_mission_is_the_most_urgent_and_most_postponed_due_or_overdue(): void
    {
        $this->mission(['title' => 'Medium today', 'priority' => 'medium', 'times_postponed' => 9]);
        $this->mission(['title' => 'Critical overdue', 'priority' => 'critical', 'due_date' => '2026-10-15', 'times_postponed' => 1]);
        $this->mission(['title' => 'Critical often postponed', 'priority' => 'critical', 'times_postponed' => 4]);
        $this->mission(['title' => 'Critical tomorrow', 'priority' => 'critical', 'due_date' => '2026-10-18', 'times_postponed' => 10]);
        $this->mission(['title' => 'Critical done', 'priority' => 'critical', 'times_postponed' => 20, 'status' => 'completed']);

        $this->dashboard()
            ->assertJsonPath('data.morning_brief.mission.title', 'Critical often postponed')
            ->assertJsonPath('data.morning_brief.mission.times_postponed', 4);
    }

    public function test_todays_missions_are_open_due_today_by_priority_then_postponements(): void
    {
        $this->mission(['title' => 'Low', 'priority' => 'low']);
        $this->mission(['title' => 'High once', 'priority' => 'high', 'times_postponed' => 1]);
        $this->mission(['title' => 'High twice', 'priority' => 'high', 'times_postponed' => 2]);
        $this->mission(['title' => 'Critical', 'priority' => 'critical']);
        $this->mission(['title' => 'Medium', 'priority' => 'medium']);
        $this->mission(['title' => 'Medium 2', 'priority' => 'medium']);
        $this->mission(['title' => 'Overdue', 'priority' => 'critical', 'due_date' => '2026-10-16']);
        $this->mission(['title' => 'Done', 'priority' => 'critical', 'status' => 'completed']);

        $titles = collect($this->dashboard()->json('data.todays_missions'))->pluck('title');

        $this->assertSame(['Critical', 'High twice', 'High once', 'Medium', 'Medium 2'], $titles->all());
    }

    public function test_mission_success_counts_today_and_yesterday(): void
    {
        $this->mission(['status' => 'completed']);
        $this->mission([]);
        $this->mission([]);
        $this->mission(['status' => 'abandoned']);
        $this->mission(['status' => 'completed', 'due_date' => '2026-10-16']);

        $this->dashboard()->assertJsonPath('data.stats.mission_success', [
            'completed_today' => 1,
            'total_due_today' => 3,
            'percentage' => 33,
            'yesterday_percentage' => 100,
        ]);
    }

    public function test_arsenal_lists_habits_due_today_and_the_brief_shows_three_unfinished(): void
    {
        $done = $this->habit(['name' => 'Done']);
        $this->habit(['name' => 'A']);
        $this->habit(['name' => 'B']);
        $this->habit(['name' => 'C']);
        $this->habit(['name' => 'D']);
        $this->habit(['name' => 'Inactive', 'active' => false]);
        // 17 October 2026 is a Saturday (ISO 6).
        $this->habit(['name' => 'Weekdays only', 'type' => 'specific_days', 'frequency' => ['days' => [1, 2, 3, 4, 5]]]);
        ArsenalLog::create(['arsenal_id' => $done->id, 'user_id' => $this->user->id, 'date' => '2026-10-17', 'completed' => true]);

        $response = $this->dashboard();

        $this->assertSame(['Done', 'A', 'B', 'C', 'D'], collect($response->json('data.todays_arsenal'))->pluck('name')->all());
        $response->assertJsonPath('data.todays_arsenal.0.completed', true);
        $this->assertSame(['A', 'B', 'C'], collect($response->json('data.morning_brief.habits'))->pluck('name')->all());
    }

    public function test_longest_streak_and_focus_time(): void
    {
        $habit = $this->habit(['name' => 'Morning run']);
        foreach (['2026-10-14', '2026-10-15', '2026-10-16'] as $date) {
            ArsenalLog::create(['arsenal_id' => $habit->id, 'user_id' => $this->user->id, 'date' => $date, 'completed' => true]);
        }
        $this->habit(['name' => 'New habit']);

        FocusSession::factory()->for($this->user)->create(['start_time' => '2026-10-17 00:10:00', 'duration_minutes' => 50]);
        FocusSession::factory()->for($this->user)->create(['start_time' => '2026-10-16 23:00:00', 'duration_minutes' => 25]);
        // Yesterday in Manila, and an unfinished session: neither counts.
        FocusSession::factory()->for($this->user)->create(['start_time' => '2026-10-16 15:00:00', 'duration_minutes' => 25]);
        FocusSession::factory()->for($this->user)->create(['start_time' => '2026-10-17 00:30:00', 'completed' => false]);

        $this->dashboard()
            ->assertJsonPath('data.stats.longest_streak', ['habit_name' => 'Morning run', 'streak_count' => 3, 'streak_unit' => 'days'])
            ->assertJsonPath('data.stats.focus_time', ['minutes_today' => 75, 'goal_minutes' => 240, 'percentage' => 31]);
    }

    public function test_other_users_data_is_never_included(): void
    {
        $other = User::factory()->create();
        Mission::factory()->for($other)->create(['due_date' => '2026-10-17']);
        Arsenal::factory()->for($other)->create();

        $this->dashboard()
            ->assertJsonPath('data.morning_brief.mission', null)
            ->assertJsonCount(0, 'data.todays_missions')
            ->assertJsonCount(0, 'data.todays_arsenal')
            ->assertJsonPath('data.stats.longest_streak', null);
    }

    private function dashboard()
    {
        return $this->actingAs($this->user, 'sanctum')->getJson('/api/v1/dashboard')->assertOk();
    }

    private function mission(array $attributes): Mission
    {
        return Mission::factory()->for($this->user)->create(['due_date' => '2026-10-17', ...$attributes]);
    }

    private function habit(array $attributes): Arsenal
    {
        return Arsenal::factory()->for($this->user)->create(['created_at' => '2026-09-01 00:00:00', ...$attributes]);
    }
}
