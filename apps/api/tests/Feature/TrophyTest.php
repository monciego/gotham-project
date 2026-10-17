<?php

namespace Tests\Feature;

use App\Models\Achievement;
use App\Models\AlfredMessage;
use App\Models\Arsenal;
use App\Models\ArsenalLog;
use App\Models\FocusSession;
use App\Models\Mission;
use App\Models\User;
use App\Services\AchievementService;
use Carbon\CarbonImmutable;
use Database\Seeders\AchievementsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TrophyTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(AchievementsSeeder::class);
        $this->travelTo('2026-10-17 01:00:00');
        $this->user = User::factory()->create(['timezone' => 'UTC']);
        $this->actingAs($this->user, 'sanctum');
    }

    private function mission(array $attributes = []): Mission
    {
        return Mission::factory()->for($this->user)->create(['status' => 'not_started', 'due_date' => '2026-10-17', ...$attributes]);
    }

    private function earned(string $key): bool
    {
        return $this->user->achievements()->where('key', $key)->exists();
    }

    public function test_responses_carry_what_the_request_earned(): void
    {
        $mission = $this->mission(['priority' => 'critical', 'title' => 'Stop the Joker']);

        $response = $this->postJson("/api/v1/missions/{$mission->id}/complete")
            ->assertOk()
            ->assertJsonPath('rewards.xp.0', ['amount' => 100, 'reason' => 'mission_complete', 'label' => 'Stop the Joker'])
            ->assertJsonPath('rewards.xp.1', ['amount' => 50, 'reason' => 'trophy', 'label' => 'First Patrol'])
            ->assertJsonPath('rewards.xp_total', 150)
            ->assertJsonPath('rewards.level_up', null)
            ->assertJsonPath('rewards.trophies.0.key', 'first_mission')
            ->assertJsonPath('rewards.trophies.0.icon', 'target')
            ->assertJsonPath('data.achievements.0.key', 'first_mission');

        $this->assertNotNull($response->json('rewards.trophies.0.earned_at'));
        $this->assertSame(2, $this->user->xpEvents()->count());
        $this->assertDatabaseHas('alfred_messages', ['title' => 'Trophy unlocked: First Patrol. Well earned, sir.', 'mood' => 'proud']);

        // Nothing earned, no rewards; errors never carry them.
        $this->getJson('/api/v1/missions')->assertOk()->assertJsonMissingPath('rewards');
        $this->postJson("/api/v1/missions/{$mission->id}/abandon")->assertUnprocessable()->assertJsonMissingPath('rewards');
    }

    public function test_levelling_up_and_the_xp_history(): void
    {
        $this->user->forceFill(['total_xp' => 980, 'current_level' => 1])->save();
        // Already earned, so only the mission's XP counts here.
        $this->user->achievements()->attach(Achievement::where('key', 'first_mission')->value('id'), ['earned_at' => now()]);
        $mission = $this->mission(['priority' => 'low', 'title' => 'Feed the dog']);

        $this->postJson("/api/v1/missions/{$mission->id}/complete")
            ->assertJsonPath('rewards.level_up', ['from' => 1, 'to' => 2])
            ->assertJsonPath('data.level_up', true);

        $this->assertDatabaseHas('alfred_messages', ['title' => 'Level 2, sir.', 'message' => "You're becoming who you need to be, sir."]);

        $this->getJson('/api/v1/user/xp-history')
            ->assertOk()
            ->assertJsonPath('data.level.current_level', 2)
            ->assertJsonPath('data.level.xp_into_level', 5)
            ->assertJsonPath('data.level.next_level_xp', 2000)
            ->assertJsonPath('data.events.0', fn (array $event) => $event['amount'] === 25
                && $event['label'] === 'Feed the dog'
                && $event['level_before'] === 1
                && $event['level_after'] === 2
                && $event['total_after'] === 1005);
    }

    public function test_undoing_a_check_in_records_the_xp_taken_back(): void
    {
        $habit = Arsenal::factory()->for($this->user)->create(['name' => 'Run', 'created_at' => '2026-10-10']);

        $this->postJson("/api/v1/arsenal/{$habit->id}/complete")->assertJsonPath('rewards.xp.0.amount', 10);
        $this->deleteJson("/api/v1/arsenal/{$habit->id}/complete")
            ->assertJsonPath('rewards.xp', [['amount' => -10, 'reason' => 'habit_undo', 'label' => 'Run']]);

        $this->assertSame([10, 50, -10], $this->user->xpEvents()->orderBy('id')->pluck('amount')->all());
    }

    public function test_index_lists_every_trophy_with_progress(): void
    {
        foreach (range(1, 3) as $index) {
            $this->postJson('/api/v1/missions/'.$this->mission()->id.'/complete');
        }

        $response = $this->getJson('/api/v1/trophies')
            ->assertOk()
            ->assertJsonPath('data.summary.total', 43)
            ->assertJsonPath('data.level.current_level', 1);

        $trophies = collect($response->json('data.trophies'))->keyBy('key');
        $this->assertTrue($trophies['first_mission']['earned']);
        $this->assertNotNull($trophies['first_mission']['earned_at']);
        $this->assertSame(['current' => 1, 'target' => 1], $trophies['first_mission']['progress']);
        $this->assertFalse($trophies['missions_10']['earned']);
        $this->assertSame(['current' => 3, 'target' => 10], $trophies['missions_10']['progress']);
        $this->assertSame(['current' => 0, 'target' => 600], $trophies['focus_10_hours']['progress']);
        $this->assertSame('special', $trophies['perfect_day']['category']);

        $id = $trophies['missions_10']['id'];
        $this->getJson("/api/v1/trophies/{$id}")->assertOk()->assertJsonPath('data.progress.current', 3);
        $this->getJson('/api/v1/trophies/99999')->assertNotFound();
        $this->getJson('/api/v1/trophies/leaderboard')->assertJsonPath('data.0.is_you', true);
    }

    public function test_seven_days_in_a_row_earns_the_login_streak(): void
    {
        foreach (range(0, 6) as $day) {
            $this->travelTo(CarbonImmutable::parse('2026-10-17 09:00')->addDays($day));
            $response = $this->getJson('/api/v1/auth/me')->assertOk();
            // A second request the same day records nothing more.
            $this->getJson('/api/v1/auth/me');
        }

        $response->assertJsonPath('rewards.trophies.0.key', 'login_streak_7');
        $this->assertSame(7, $this->user->activityDays()->count());
    }

    public function test_a_perfect_day_needs_every_habit_and_every_mission(): void
    {
        $habit = Arsenal::factory()->for($this->user)->create(['created_at' => '2026-10-17 00:00:00']);
        $mission = $this->mission();

        $this->postJson("/api/v1/missions/{$mission->id}/complete");
        $this->assertFalse($this->earned('perfect_day'));

        $this->postJson("/api/v1/arsenal/{$habit->id}/complete")->assertJsonPath('rewards.trophies', fn (array $trophies) => collect($trophies)->contains('key', 'perfect_day'));
    }

    public function test_seven_days_of_missions_without_postponing(): void
    {
        foreach (range(1, 6) as $daysAgo) {
            $this->mission(['status' => 'completed', 'completed_at' => CarbonImmutable::parse('2026-10-17 12:00')->subDays($daysAgo)]);
        }
        $postponed = $this->mission(['due_date' => '2026-10-17']);
        $this->putJson("/api/v1/missions/{$postponed->id}", ['due_date' => '2026-10-20'])->assertOk();
        $this->assertDatabaseHas('mission_postponements', ['mission_id' => $postponed->id]);

        // Today had a postponement, so the run is six days, not seven.
        $this->postJson('/api/v1/missions/'.$this->mission()->id.'/complete');
        $this->assertFalse($this->earned('no_postpone_7'));

        $this->travel(1)->day();
        $this->postJson('/api/v1/missions/'.$this->mission(['due_date' => '2026-10-18'])->id.'/complete');
        $this->assertFalse($this->earned('no_postpone_7'));

        // A clean week from the 18th.
        foreach (range(1, 6) as $day) {
            $this->travel(1)->day();
            $this->postJson('/api/v1/missions/'.$this->mission(['due_date' => now()->toDateString()])->id.'/complete');
        }
        $this->assertTrue($this->earned('no_postpone_7'));
    }

    public function test_four_hours_of_focus_in_a_day(): void
    {
        FocusSession::factory()->for($this->user)->create(['start_time' => '2026-10-16 08:00', 'duration_minutes' => 120]);
        FocusSession::factory()->for($this->user)->create(['start_time' => '2026-10-16 13:00', 'duration_minutes' => 110]);

        app(AchievementService::class)->checkAndAward($this->user, 'focus_complete');
        $this->assertFalse($this->earned('focus_day_4_hours'));

        FocusSession::factory()->for($this->user)->create(['start_time' => '2026-10-16 18:00', 'duration_minutes' => 10]);
        app(AchievementService::class)->checkAndAward($this->user, 'focus_complete');
        $this->assertTrue($this->earned('focus_day_4_hours'));
    }

    public function test_acting_on_alfred_within_five_minutes_ten_times(): void
    {
        $slow = AlfredMessage::factory()->for($this->user)->create();
        $this->travel(6)->minutes();
        $this->postJson("/api/v1/alfred-messages/{$slow->id}/act")->assertOk();

        foreach (range(1, 9) as $index) {
            $message = AlfredMessage::factory()->for($this->user)->create();
            $this->travel(2)->minutes();
            $this->postJson("/api/v1/alfred-messages/{$message->id}/act");
        }
        $this->assertFalse($this->earned('alfred_fast_10'));

        $message = AlfredMessage::factory()->for($this->user)->create();
        $this->postJson("/api/v1/alfred-messages/{$message->id}/act")
            ->assertJsonPath('rewards.trophies.0.key', 'alfred_fast_10');
    }

    public function test_a_streak_rebuilt_after_a_break(): void
    {
        $habit = Arsenal::factory()->for($this->user)->create(['created_at' => '2026-09-27 00:00:00']);
        // Done Sep 27–29, missed Sep 30 – Oct 9, then done every day from Oct 10.
        $days = [...range(0, 2), ...range(13, 19)];
        foreach ($days as $offset) {
            ArsenalLog::create([
                'arsenal_id' => $habit->id,
                'user_id' => $this->user->id,
                'date' => CarbonImmutable::parse('2026-09-27')->addDays($offset)->toDateString(),
                'completed' => true,
            ]);
        }

        app(AchievementService::class)->checkAndAward($this->user, 'habit_complete');
        $this->assertTrue($this->earned('comeback'));
    }
}
