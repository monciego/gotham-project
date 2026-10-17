<?php

namespace Tests\Feature;

use App\Models\FocusSession;
use App\Models\Mission;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FocusSessionTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->travelTo('2026-10-17 01:00:00');
        $this->user = User::factory()->create(['timezone' => 'UTC']);
        $this->actingAs($this->user, 'sanctum');
    }

    public function test_a_session_can_start_without_a_mission(): void
    {
        $this->postJson('/api/v1/focus-sessions')
            ->assertCreated()
            ->assertJsonPath('data.mission', null)
            ->assertJsonPath('data.duration_minutes', 25)
            ->assertJsonPath('data.end_time', null);
    }

    public function test_starting_a_session_on_a_mission_puts_it_in_progress(): void
    {
        $mission = Mission::factory()->for($this->user)->create(['status' => 'not_started']);

        $this->postJson('/api/v1/focus-sessions', ['mission_id' => $mission->id, 'duration_minutes' => 50, 'energy_before' => 7])
            ->assertCreated()
            ->assertJsonPath('data.mission.title', $mission->title)
            ->assertJsonPath('data.duration_minutes', 50)
            ->assertJsonPath('data.energy_before', 7);

        $this->assertSame('in_progress', $mission->refresh()->status);
    }

    public function test_sessions_need_an_open_mission_of_your_own(): void
    {
        $closed = Mission::factory()->for($this->user)->create(['status' => 'completed']);
        $theirs = Mission::factory()->create();

        $this->postJson('/api/v1/focus-sessions', ['mission_id' => $closed->id])->assertJsonValidationErrors(['mission_id']);
        $this->postJson('/api/v1/focus-sessions', ['mission_id' => $theirs->id])->assertJsonValidationErrors(['mission_id']);
        $this->postJson('/api/v1/focus-sessions', ['energy_before' => 11])->assertJsonValidationErrors(['energy_before']);
    }

    public function test_starting_a_session_abandons_the_one_already_running(): void
    {
        $first = $this->postJson('/api/v1/focus-sessions')->json('data.id');
        $this->travel(10)->minutes();
        $this->postJson('/api/v1/focus-sessions')->assertCreated();

        $ended = FocusSession::find($first);
        $this->assertNotNull($ended->end_time);
        $this->assertFalse($ended->completed);
        $this->assertSame(10, $ended->duration_minutes);
    }

    public function test_completing_awards_xp_records_time_and_has_alfred_say_so(): void
    {
        $mission = Mission::factory()->for($this->user)->create(['actual_minutes' => 0]);
        $session = $this->postJson('/api/v1/focus-sessions', ['mission_id' => $mission->id, 'duration_minutes' => 50])->json('data.id');

        // A tab left open for hours only counts the planned length.
        $this->travel(3)->hours();
        $this->postJson("/api/v1/focus-sessions/{$session}/complete", ['distractions' => 3])
            ->assertOk()
            ->assertJsonPath('message', 'Well done, sir. 50 minutes of focused work.')
            ->assertJsonPath('data.session.duration_minutes', 50)
            ->assertJsonPath('data.session.completed', true)
            ->assertJsonPath('data.session.distractions', 3)
            ->assertJsonPath('data.session.xp_awarded', 10)
            ->assertJsonPath('data.xp_awarded', 10);

        $this->assertSame(50, $mission->refresh()->actual_minutes);
        $this->assertGreaterThanOrEqual(10, $this->user->refresh()->total_xp);
        $this->assertDatabaseHas('alfred_messages', [
            'user_id' => $this->user->id,
            'title' => 'Well done, sir.',
            'message' => "50 minutes of focused work on '{$mission->title}'. Gotham is a little safer tonight.",
            'type' => 'session_complete',
        ]);

        $this->postJson("/api/v1/focus-sessions/{$session}/complete")->assertJsonValidationErrors(['session']);
        $this->postJson("/api/v1/focus-sessions/{$session}/abandon")->assertJsonValidationErrors(['session']);
    }

    public function test_short_sessions_earn_no_xp(): void
    {
        $session = $this->postJson('/api/v1/focus-sessions')->json('data.id');
        $this->travel(20)->minutes();

        $this->postJson("/api/v1/focus-sessions/{$session}/complete")
            ->assertJsonPath('data.session.duration_minutes', 20)
            ->assertJsonPath('data.xp_awarded', 0);
    }

    public function test_abandoned_sessions_record_time_but_not_on_the_mission(): void
    {
        $mission = Mission::factory()->for($this->user)->create(['actual_minutes' => 0]);
        $done = $this->postJson('/api/v1/focus-sessions', ['mission_id' => $mission->id])->json('data.id');
        $this->travel(25)->minutes();
        $this->postJson("/api/v1/focus-sessions/{$done}/complete")->assertOk();

        $stopped = $this->postJson('/api/v1/focus-sessions', ['mission_id' => $mission->id])->json('data.id');
        $this->travel(7)->minutes();
        $this->postJson("/api/v1/focus-sessions/{$stopped}/abandon", ['distractions' => 2])
            ->assertOk()
            ->assertJsonPath('data.completed', false)
            ->assertJsonPath('data.duration_minutes', 7)
            ->assertJsonPath('data.distractions', 2)
            ->assertJsonPath('data.xp_awarded', 0);

        $this->assertSame(25, $mission->refresh()->actual_minutes);
    }

    public function test_partial_minutes_are_not_counted(): void
    {
        $session = $this->postJson('/api/v1/focus-sessions')->json('data.id');
        $this->travel(50)->seconds();

        $this->postJson("/api/v1/focus-sessions/{$session}/abandon")->assertJsonPath('data.duration_minutes', 0);
    }

    public function test_energy_is_rated_after_the_session_ends(): void
    {
        $session = $this->postJson('/api/v1/focus-sessions')->json('data.id');

        $this->patchJson("/api/v1/focus-sessions/{$session}/energy", ['energy_after' => 8])->assertJsonValidationErrors(['session']);

        $this->travel(25)->minutes();
        $this->postJson("/api/v1/focus-sessions/{$session}/complete");

        $this->patchJson("/api/v1/focus-sessions/{$session}/energy", ['energy_after' => 11])->assertJsonValidationErrors(['energy_after']);
        $this->patchJson("/api/v1/focus-sessions/{$session}/energy", ['energy_after' => 8])
            ->assertOk()
            ->assertJsonPath('data.energy_after', 8);
    }

    public function test_index_filters_by_day_and_mission(): void
    {
        $mission = Mission::factory()->for($this->user)->create();
        FocusSession::factory()->for($this->user)->for($mission)->create(['start_time' => '2026-10-16 09:00:00', 'duration_minutes' => 25]);
        FocusSession::factory()->for($this->user)->create(['start_time' => '2026-10-16 14:00:00', 'duration_minutes' => 50]);
        FocusSession::factory()->for($this->user)->create(['start_time' => '2026-10-14 09:00:00']);
        FocusSession::factory()->create(['start_time' => '2026-10-16 09:00:00']);

        $this->getJson('/api/v1/focus-sessions?from=2026-10-15&to=2026-10-16')
            ->assertOk()
            ->assertJsonCount(2, 'data.items')
            ->assertJsonPath('data.items.0.duration_minutes', 50)
            ->assertJsonPath('data.meta.total_minutes', 75);

        $this->getJson("/api/v1/focus-sessions?mission_id={$mission->id}")
            ->assertJsonCount(1, 'data.items')
            ->assertJsonPath('data.items.0.mission.id', $mission->id);
    }

    public function test_other_users_sessions_are_not_found(): void
    {
        $theirs = FocusSession::factory()->create(['end_time' => null]);

        $this->getJson("/api/v1/focus-sessions/{$theirs->id}")->assertNotFound();
        $this->postJson("/api/v1/focus-sessions/{$theirs->id}/complete")->assertNotFound();
    }

    public function test_completing_a_mission_completes_its_running_session(): void
    {
        $mission = Mission::factory()->for($this->user)->create(['actual_minutes' => 0]);
        $this->postJson('/api/v1/focus-sessions', ['mission_id' => $mission->id]);
        $this->travel(12)->minutes();

        $this->postJson("/api/v1/missions/{$mission->id}/complete")
            ->assertOk()
            ->assertJsonPath('data.mission.active_session', null);

        $session = $mission->focusSessions()->sole();
        $this->assertSame(12, $session->duration_minutes);
        $this->assertTrue($session->completed);
        $this->assertSame(12, $mission->refresh()->actual_minutes);
    }

    public function test_abandoning_a_mission_abandons_its_running_session(): void
    {
        $mission = Mission::factory()->for($this->user)->create();
        $this->postJson('/api/v1/focus-sessions', ['mission_id' => $mission->id]);
        $this->travel(5)->minutes();

        $this->postJson("/api/v1/missions/{$mission->id}/abandon", ['reason' => 'No longer needed'])->assertOk();

        $session = $mission->focusSessions()->sole();
        $this->assertNotNull($session->end_time);
        $this->assertFalse($session->completed);
    }
}
