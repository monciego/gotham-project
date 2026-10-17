<?php

namespace Tests\Feature;

use App\Models\Mission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FocusSessionTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_session_starts_the_mission_and_records_time_when_it_ends(): void
    {
        $this->travelTo('2026-10-17 01:00:00');
        $mission = Mission::factory()->create();

        $session = $this->actingAs($mission->user, 'sanctum')
            ->postJson("/api/v1/missions/{$mission->id}/focus-sessions", ['energy_before' => 3])
            ->assertCreated()
            ->assertJsonPath('data.duration_minutes', 25)
            ->json('data.id');

        $this->assertSame('in_progress', $mission->refresh()->status);
        $this->getJson("/api/v1/missions/{$mission->id}")->assertJsonPath('data.active_session.id', $session);

        $this->travel(30)->minutes();
        $this->postJson("/api/v1/focus-sessions/{$session}/end", ['completed' => true, 'energy_after' => 4])
            ->assertOk()
            ->assertJsonPath('data.session.duration_minutes', 25)
            ->assertJsonPath('data.session.completed', true);

        $this->assertSame(25, $mission->refresh()->actual_minutes);
        $this->postJson("/api/v1/focus-sessions/{$session}/end", ['completed' => true])->assertJsonValidationErrors(['session']);
    }

    public function test_completing_a_mission_ends_its_running_session(): void
    {
        $this->travelTo('2026-10-17 01:00:00');
        $mission = Mission::factory()->create();

        $this->actingAs($mission->user, 'sanctum')->postJson("/api/v1/missions/{$mission->id}/focus-sessions");
        $this->travel(12)->minutes();
        $this->postJson("/api/v1/missions/{$mission->id}/complete")
            ->assertOk()
            ->assertJsonPath('data.mission.active_session', null);

        $session = $mission->focusSessions()->sole();
        $this->assertSame(12, $session->duration_minutes);
        $this->assertFalse($session->completed);
        $this->assertSame(12, $mission->refresh()->actual_minutes);
    }

    public function test_starting_a_session_ends_the_one_already_running(): void
    {
        $this->travelTo('2026-10-17 01:00:00');
        $first = Mission::factory()->create();
        $second = Mission::factory()->for($first->user)->create();

        $this->actingAs($first->user, 'sanctum')->postJson("/api/v1/missions/{$first->id}/focus-sessions");
        $this->travel(10)->minutes();
        $this->postJson("/api/v1/missions/{$second->id}/focus-sessions")->assertCreated();

        $ended = $first->focusSessions()->sole();
        $this->assertNotNull($ended->end_time);
        $this->assertFalse($ended->completed);
        $this->assertSame(10, $ended->duration_minutes);
    }
}
