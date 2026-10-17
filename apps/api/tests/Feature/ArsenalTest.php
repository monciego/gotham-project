<?php

namespace Tests\Feature;

use App\Models\Arsenal;
use App\Models\ArsenalLog;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ArsenalTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private CarbonImmutable $today;

    protected function setUp(): void
    {
        parent::setUp();

        // Saturday 17 October 2026, 09:00 in Manila.
        $this->travelTo('2026-10-17 01:00:00');
        $this->user = User::factory()->create(['timezone' => 'Asia/Manila', 'current_mode' => 'batman']);
        $this->today = CarbonImmutable::parse('2026-10-17');
        $this->actingAs($this->user, 'sanctum');
    }

    public function test_creating_a_habit_keeps_only_the_frequency_its_type_uses(): void
    {
        $this->postJson('/api/v1/arsenal', [
            'name' => 'Strength training',
            'category' => 'physical',
            'type' => 'specific_days',
            'frequency' => ['days' => [5, 1, 3], 'times' => 4],
            'target_value' => 10,
            'reminder_time' => '06:30',
            'mode_specific' => ['batman', 'wayne'],
        ])
            ->assertCreated()
            ->assertJsonPath('data.frequency', ['days' => [1, 3, 5]])
            ->assertJsonPath('data.target_value', null)
            ->assertJsonPath('data.reminder_time', '06:30')
            ->assertJsonPath('data.mode_specific', ['batman', 'wayne'])
            ->assertJsonPath('data.current_streak', 0);
    }

    public function test_each_type_requires_its_settings(): void
    {
        $base = ['name' => 'Habit', 'category' => 'health'];

        $this->postJson('/api/v1/arsenal', [...$base, 'type' => 'weekly'])->assertJsonValidationErrors(['frequency.times']);
        $this->postJson('/api/v1/arsenal', [...$base, 'type' => 'specific_days', 'frequency' => ['days' => []]])->assertJsonValidationErrors(['frequency.days']);
        $this->postJson('/api/v1/arsenal', [...$base, 'type' => 'interval'])->assertJsonValidationErrors(['frequency.every']);
        $this->postJson('/api/v1/arsenal', [...$base, 'type' => 'measurable'])->assertJsonValidationErrors(['target_value', 'unit']);
        $this->postJson('/api/v1/arsenal', ['type' => 'daily', 'category' => 'chores', 'mode_specific' => ['joker']])
            ->assertJsonValidationErrors(['name', 'category', 'mode_specific.0']);
    }

    public function test_changing_the_type_clears_settings_it_no_longer_uses(): void
    {
        $habit = $this->habit(['type' => 'measurable', 'target_value' => 8, 'unit' => 'glasses']);

        $this->putJson("/api/v1/arsenal/{$habit->id}", ['type' => 'weekly', 'frequency' => ['times' => 3]])
            ->assertOk()
            ->assertJsonPath('data.type', 'weekly')
            ->assertJsonPath('data.frequency', ['times' => 3])
            ->assertJsonPath('data.target_value', null)
            ->assertJsonPath('data.unit', null);

        // Other edits leave the schedule alone.
        $this->putJson("/api/v1/arsenal/{$habit->id}", ['name' => 'Gym', 'active' => false])
            ->assertJsonPath('data.frequency', ['times' => 3])
            ->assertJsonPath('data.active', false);
    }

    public function test_index_lists_every_habit_with_todays_state_and_this_months_rate(): void
    {
        $run = $this->habit(['name' => 'Run']);
        // October so far: done on the 1st to 12th and 15th, missed the 13th, 14th and 16th; today is pending.
        $this->logDays($run, [...range(1, 12), 15]);
        $this->habit(['name' => 'Archived', 'active' => false]);

        $this->getJson('/api/v1/arsenal')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.month_rate', 81)
            ->assertJsonPath('data.0.active_today', true)
            ->assertJsonPath('data.1.active', false)
            ->assertJsonPath('data.1.active_today', false);
    }

    public function test_today_lists_habits_due_today_in_the_current_mode(): void
    {
        $this->habit(['name' => 'Daily']);
        $this->habit(['name' => 'Weekdays', 'type' => 'specific_days', 'frequency' => ['days' => [1, 2, 3, 4, 5]]]);
        $this->habit(['name' => 'Saturdays', 'type' => 'specific_days', 'frequency' => ['days' => [6]]]);
        $this->habit(['name' => 'Wayne only', 'mode_specific' => ['wayne']]);
        $this->habit(['name' => 'Batman only', 'mode_specific' => ['batman']]);
        $metTarget = $this->habit(['name' => 'Weekly, done', 'type' => 'weekly', 'frequency' => ['times' => 1]]);
        $this->logDays($metTarget, [14]);
        $this->habit(['name' => 'Weekly, open', 'type' => 'weekly', 'frequency' => ['times' => 1]]);
        $interval = $this->habit(['name' => 'Every 3 days, done yesterday', 'type' => 'interval', 'frequency' => ['every' => 3]]);
        $this->logDays($interval, [16]);
        $this->habit(['name' => 'Archived', 'active' => false]);

        $names = collect($this->getJson('/api/v1/arsenal/today')->assertOk()->json('data'))->pluck('name')->all();

        $this->assertSame(['Daily', 'Saturdays', 'Batman only', 'Weekly, open'], $names);
    }

    public function test_streaks_worth_protecting_are_flagged_until_checked_in(): void
    {
        $long = $this->habit(['name' => 'Long']);
        $this->logDays($long, range(10, 16));
        $short = $this->habit(['name' => 'Short']);
        $this->logDays($short, [15, 16]);

        $habits = collect($this->getJson('/api/v1/arsenal')->json('data'))->keyBy('name');
        $this->assertTrue($habits['Long']['streak_at_risk']);
        $this->assertFalse($habits['Short']['streak_at_risk']);

        $this->postJson("/api/v1/arsenal/{$long->id}/skip");
        $this->assertFalse(collect($this->getJson('/api/v1/arsenal')->json('data'))->firstWhere('name', 'Long')['streak_at_risk']);
    }

    public function test_show_returns_analytics_and_recent_logs(): void
    {
        $habit = $this->habit(['type' => 'measurable', 'target_value' => 8, 'unit' => 'glasses']);
        $this->logDays($habit, [14, 15], value: 6);
        ArsenalLog::create(['arsenal_id' => $habit->id, 'user_id' => $this->user->id, 'date' => '2026-10-16', 'skipped' => true]);

        $response = $this->getJson("/api/v1/arsenal/{$habit->id}")
            ->assertOk()
            ->assertJsonPath('data.habit.id', $habit->id)
            ->assertJsonCount(30, 'data.analytics.last_30_days')
            ->assertJsonCount(7, 'data.analytics.by_weekday')
            ->assertJsonCount(3, 'data.recent_logs')
            ->assertJsonPath('data.recent_logs.0.date', '2026-10-16');

        // 52 weeks from Sunday 19 October 2025 to this Saturday.
        $heatmap = collect($response->json('data.analytics.heatmap'))->keyBy('date');
        $this->assertCount(364, $heatmap);
        $this->assertSame('2025-10-19', $heatmap->keys()->first());
        $this->assertSame('none', $heatmap['2026-08-31']['state']);
        $this->assertSame('missed', $heatmap['2026-09-01']['state']);
        $this->assertSame(['date' => '2026-10-15', 'state' => 'completed', 'value' => 6], $heatmap['2026-10-15']);
        $this->assertSame('skipped', $heatmap['2026-10-16']['state']);
        $this->assertSame('pending', $heatmap['2026-10-17']['state']);
    }

    public function test_logs_are_listed_by_month(): void
    {
        $habit = $this->habit();
        $this->logDays($habit, [1, 16]);
        ArsenalLog::create(['arsenal_id' => $habit->id, 'user_id' => $this->user->id, 'date' => '2026-09-30', 'completed' => true]);

        $this->getJson("/api/v1/arsenal/{$habit->id}/logs")->assertJsonCount(2, 'data')->assertJsonPath('data.0.date', '2026-10-01');
        $this->getJson("/api/v1/arsenal/{$habit->id}/logs?month=2026-09")->assertJsonCount(1, 'data');
        $this->getJson("/api/v1/arsenal/{$habit->id}/logs?month=September")->assertJsonValidationErrors(['month']);
    }

    public function test_deleting_soft_deletes_the_habit(): void
    {
        $habit = $this->habit();
        $this->logDays($habit, [16]);

        $this->deleteJson("/api/v1/arsenal/{$habit->id}")->assertOk();

        $this->assertSoftDeleted($habit);
        $this->getJson("/api/v1/arsenal/{$habit->id}")->assertNotFound();
        $this->assertSame(1, ArsenalLog::count());
    }

    public function test_other_users_habits_are_not_found(): void
    {
        $habit = Arsenal::factory()->create();

        $this->getJson("/api/v1/arsenal/{$habit->id}")->assertNotFound();
        $this->putJson("/api/v1/arsenal/{$habit->id}", ['name' => 'Mine now'])->assertNotFound();
        $this->deleteJson("/api/v1/arsenal/{$habit->id}")->assertNotFound();
        $this->getJson('/api/v1/arsenal')->assertJsonCount(0, 'data');
    }

    private function habit(array $attributes = []): Arsenal
    {
        return Arsenal::factory()->for($this->user)->create(['created_at' => '2026-09-01 00:00:00', ...$attributes]);
    }

    /** @param  list<int>  $days  Days of October 2026. */
    private function logDays(Arsenal $habit, array $days, ?int $value = null): void
    {
        foreach ($days as $day) {
            ArsenalLog::create([
                'arsenal_id' => $habit->id,
                'user_id' => $this->user->id,
                'date' => sprintf('2026-10-%02d', $day),
                'completed' => true,
                'value' => $value,
            ]);
        }
    }
}
