<?php

namespace Tests\Feature;

use App\Models\Arsenal;
use App\Models\ArsenalLog;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ArsenalCompletionTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private CarbonImmutable $today;

    protected function setUp(): void
    {
        parent::setUp();

        // Saturday 17 October 2026, 09:00 in Manila.
        $this->travelTo('2026-10-17 01:00:00');
        $this->user = User::factory()->create(['timezone' => 'Asia/Manila']);
        $this->today = CarbonImmutable::parse('2026-10-17');
    }

    public function test_completing_extends_the_streak_and_reports_milestones(): void
    {
        $habit = $this->habit();
        $this->logDaysAgo($habit, range(1, 6));

        $this->complete($habit)
            ->assertOk()
            ->assertJsonPath('data.habit.completed', true)
            ->assertJsonPath('data.habit.current_streak', 7)
            ->assertJsonPath('data.milestone', 7);

        $this->assertDatabaseHas('arsenal_logs', ['arsenal_id' => $habit->id, 'completed' => true]);
        $this->assertSame(7, $habit->refresh()->best_streak);
    }

    public function test_completing_twice_does_not_duplicate_the_log(): void
    {
        $habit = $this->habit();

        $this->complete($habit)->assertJsonPath('data.milestone', null);
        $this->complete($habit)->assertJsonPath('data.habit.current_streak', 1);

        $this->assertSame(1, ArsenalLog::count());
    }

    public function test_undoing_removes_todays_log_and_restores_the_streak(): void
    {
        $habit = $this->habit();
        $this->logDaysAgo($habit, range(1, 6));
        $this->complete($habit);

        $this->actingAs($this->user, 'sanctum')
            ->deleteJson("/api/v1/arsenal/{$habit->id}/complete")
            ->assertOk()
            ->assertJsonPath('data.habit.completed', false)
            ->assertJsonPath('data.habit.current_streak', 6)
            ->assertJsonPath('data.habit.best_streak', 6);

        $this->assertSame(6, ArsenalLog::count());
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

    public function test_days_a_habit_is_not_scheduled_do_not_break_it(): void
    {
        // Mon, Wed, Fri and Sat. Done Mon, Wed and Fri; Tue and Thu aren't due.
        $habit = $this->habit(['type' => 'specific_days', 'frequency' => ['days' => [1, 3, 5, 6]]]);
        $this->logDaysAgo($habit, [1, 3, 5]);

        $this->complete($habit)->assertJsonPath('data.habit.current_streak', 4);
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

    public function test_measurable_habits_complete_only_at_their_target(): void
    {
        $habit = $this->habit(['type' => 'measurable', 'target_value' => 20, 'unit' => 'pages']);

        $this->complete($habit, ['value' => 12])->assertJsonPath('data.habit.completed', false);
        $this->complete($habit)->assertJsonPath('data.habit.completed', true);

        $this->assertDatabaseHas('arsenal_logs', ['arsenal_id' => $habit->id, 'value' => 20]);
    }

    public function test_other_users_habits_are_not_found(): void
    {
        $habit = Arsenal::factory()->create();

        $this->complete($habit)->assertNotFound();
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
}
