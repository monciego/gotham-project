<?php

namespace Tests\Feature;

use App\Models\Arsenal;
use App\Models\ArsenalLog;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ArsenalCheckInTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private CarbonImmutable $today;

    protected function setUp(): void
    {
        parent::setUp();

        // Saturday 17 October 2026, 09:00 in Manila. Batman mode: no grace for misses.
        $this->travelTo('2026-10-17 01:00:00');
        $this->user = User::factory()->create(['timezone' => 'Asia/Manila', 'current_mode' => 'batman']);
        $this->today = CarbonImmutable::parse('2026-10-17');
    }

    public function test_completing_extends_the_streak_awards_xp_and_announces_milestones(): void
    {
        $habit = $this->habit(['name' => 'Morning run']);
        $this->logDaysAgo($habit, range(1, 6));

        $this->complete($habit)
            ->assertOk()
            ->assertJsonPath('data.habit.completed', true)
            ->assertJsonPath('data.habit.current_streak', 7)
            ->assertJsonPath('data.milestone', 7)
            ->assertJsonPath('data.xp_awarded', 10);

        $this->assertSame(7, $habit->refresh()->best_streak);
        $this->assertGreaterThanOrEqual(10, $this->user->refresh()->total_xp);
        $this->assertDatabaseHas('alfred_messages', ['user_id' => $this->user->id, 'message' => 'Morning run: 7 days in a row.']);
    }

    public function test_a_habit_can_only_be_completed_once_a_day(): void
    {
        $habit = $this->habit();

        $this->complete($habit)->assertOk()->assertJsonPath('data.milestone', null);
        $this->complete($habit)->assertJsonValidationErrors(['habit']);

        $this->assertSame(1, ArsenalLog::count());
    }

    public function test_measurable_habits_earn_a_bonus_at_their_target(): void
    {
        $short = $this->habit(['type' => 'measurable', 'target_value' => 8, 'unit' => 'glasses']);
        $full = $this->habit(['type' => 'measurable', 'target_value' => 8, 'unit' => 'glasses']);

        $this->complete($short, ['value' => 5, 'note' => 'Busy day'])
            ->assertJsonPath('data.habit.completed', true)
            ->assertJsonPath('data.habit.value', 5)
            ->assertJsonPath('data.xp_awarded', 10);
        // Without a value, one tap logs the target.
        $this->complete($full)->assertJsonPath('data.habit.value', 8)->assertJsonPath('data.xp_awarded', 30);

        $this->assertDatabaseHas('arsenal_logs', ['arsenal_id' => $short->id, 'value' => 5, 'note' => 'Busy day']);
    }

    public function test_undoing_removes_todays_log_restores_the_streak_and_takes_back_xp(): void
    {
        $habit = $this->habit();
        $this->logDaysAgo($habit, range(1, 6));
        $this->complete($habit);
        $xp = $this->user->refresh()->total_xp;

        $this->actingAs($this->user, 'sanctum')
            ->deleteJson("/api/v1/arsenal/{$habit->id}/complete")
            ->assertOk()
            ->assertJsonPath('data.habit.completed', false)
            ->assertJsonPath('data.habit.current_streak', 6)
            ->assertJsonPath('data.xp_awarded', -10);

        $this->assertSame($xp - 10, $this->user->refresh()->total_xp);
        $this->assertSame(6, ArsenalLog::count());

        // Crossing 7 again the same day doesn't repeat Alfred's message.
        $this->complete($habit)->assertJsonPath('data.milestone', 7);
        $this->assertSame(1, $this->user->alfredMessages()->where('message', 'like', '%7 days in a row.')->count());
    }

    public function test_a_missed_day_breaks_the_streak_but_a_skipped_day_does_not(): void
    {
        $missed = $this->habit();
        $this->logDaysAgo($missed, [2, 3]);
        $this->complete($missed)->assertJsonPath('data.habit.current_streak', 1);

        $skipped = $this->habit();
        $this->logDaysAgo($skipped, [2, 3]);
        ArsenalLog::create([
            'arsenal_id' => $skipped->id,
            'user_id' => $this->user->id,
            'date' => $this->today->subDay()->toDateString(),
            'skipped' => true,
        ]);
        $this->complete($skipped)->assertJsonPath('data.habit.current_streak', 3);
    }

    public function test_bruce_and_rest_modes_forgive_a_few_misses_in_a_row(): void
    {
        $this->user->update(['current_mode' => 'bruce']);
        $oneMiss = $this->habit();
        $this->logDaysAgo($oneMiss, [2, 3]);
        $twoMisses = $this->habit();
        $this->logDaysAgo($twoMisses, [3, 4]);

        $this->complete($oneMiss)->assertJsonPath('data.habit.current_streak', 3);
        $this->complete($twoMisses)->assertJsonPath('data.habit.current_streak', 1);

        $this->user->update(['current_mode' => 'rest']);
        $this->undo($twoMisses);
        $this->complete($twoMisses)->assertJsonPath('data.habit.current_streak', 3);
    }

    public function test_days_a_habit_is_not_scheduled_do_not_break_it(): void
    {
        // Mon, Wed, Fri and Sat. Done Mon, Wed and Fri; Tue and Thu aren't due.
        $habit = $this->habit(['type' => 'specific_days', 'frequency' => ['days' => [1, 3, 5, 6]]]);
        $this->logDaysAgo($habit, [1, 3, 5]);

        $this->complete($habit)->assertJsonPath('data.habit.current_streak', 4);
    }

    public function test_interval_habits_are_due_once_enough_days_have_passed_since_the_last_one(): void
    {
        $onTime = $this->habit(['type' => 'interval', 'frequency' => ['every' => 2]]);
        $this->logDaysAgo($onTime, [2, 4, 6]);
        $this->complete($onTime)->assertJsonPath('data.habit.current_streak', 4);

        // Done 5 days ago, so due 3 days ago: missed then, and every day since.
        $late = $this->habit(['type' => 'interval', 'frequency' => ['every' => 2]]);
        $this->logDaysAgo($late, [5]);
        $this->complete($late)->assertJsonPath('data.habit.current_streak', 1);
    }

    public function test_weekly_streaks_count_weeks_that_met_the_target(): void
    {
        $habit = $this->habit(['type' => 'weekly', 'frequency' => ['times' => 2]]);
        // Twice in each of the two previous weeks (Mon-Sun), once already this week.
        $this->logDaysAgo($habit, [2, 7, 10, 14, 16]);

        $this->complete($habit)
            ->assertJsonPath('data.habit.current_streak', 3)
            ->assertJsonPath('data.habit.streak_unit', 'weeks');
    }

    public function test_skipping_keeps_the_streak_and_records_the_reason(): void
    {
        $habit = $this->habit();
        $this->logDaysAgo($habit, [1, 2]);

        $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/v1/arsenal/{$habit->id}/skip", ['reason' => 'Sprained ankle'])
            ->assertOk()
            ->assertJsonPath('data.habit.skipped', true)
            ->assertJsonPath('data.habit.completed', false)
            ->assertJsonPath('data.habit.current_streak', 2)
            ->assertJsonPath('data.xp_awarded', 0);

        $this->assertDatabaseHas('arsenal_logs', ['arsenal_id' => $habit->id, 'skipped' => true, 'note' => 'Sprained ankle']);
        $this->postJson("/api/v1/arsenal/{$habit->id}/skip")->assertJsonValidationErrors(['habit']);

        // Changing your mind and doing it after all is fine.
        $this->complete($habit)->assertJsonPath('data.habit.skipped', false)->assertJsonPath('data.habit.current_streak', 3);
        $this->postJson("/api/v1/arsenal/{$habit->id}/skip")->assertJsonValidationErrors(['habit']);
    }

    public function test_archived_habits_cannot_be_checked_in(): void
    {
        $habit = $this->habit(['active' => false]);

        $this->complete($habit)->assertJsonValidationErrors(['habit']);
    }

    public function test_other_users_habits_are_not_found(): void
    {
        $habit = Arsenal::factory()->create();

        $this->complete($habit)->assertNotFound();
        $this->postJson("/api/v1/arsenal/{$habit->id}/skip")->assertNotFound();
    }

    private function habit(array $attributes = []): Arsenal
    {
        return Arsenal::factory()->for($this->user)->create(['created_at' => '2026-09-01 00:00:00', ...$attributes]);
    }

    /** @param  list<int>  $daysAgo */
    private function logDaysAgo(Arsenal $habit, array $daysAgo): void
    {
        foreach ($daysAgo as $days) {
            ArsenalLog::create([
                'arsenal_id' => $habit->id,
                'user_id' => $this->user->id,
                'date' => $this->today->subDays($days)->toDateString(),
                'completed' => true,
            ]);
        }
    }

    private function complete(Arsenal $habit, array $data = [])
    {
        return $this->actingAs($this->user, 'sanctum')->postJson("/api/v1/arsenal/{$habit->id}/complete", $data);
    }

    private function undo(Arsenal $habit)
    {
        return $this->actingAs($this->user, 'sanctum')->deleteJson("/api/v1/arsenal/{$habit->id}/complete");
    }
}
