<?php

namespace Tests\Feature;

use App\Models\Mission;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MissionDependencyTest extends TestCase
{
    use RefreshDatabase;

    public function test_dependencies_can_be_added_and_removed(): void
    {
        $user = User::factory()->create();
        [$a, $b] = Mission::factory()->for($user)->count(2)->create();

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/v1/missions/{$a->id}/dependencies", ['depends_on_id' => $b->id])
            ->assertCreated()
            ->assertJsonPath('data.0.id', $b->id);

        $this->deleteJson("/api/v1/missions/{$a->id}/dependencies/{$b->id}")
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_cycles_and_self_dependencies_are_rejected(): void
    {
        $user = User::factory()->create();
        [$a, $b, $c] = Mission::factory()->for($user)->count(3)->create();
        $a->dependencies()->attach($b);
        $b->dependencies()->attach($c);

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/v1/missions/{$c->id}/dependencies", ['depends_on_id' => $a->id])
            ->assertJsonValidationErrors(['depends_on_id']);

        $this->postJson("/api/v1/missions/{$a->id}/dependencies", ['depends_on_id' => $a->id])
            ->assertJsonValidationErrors(['depends_on_id']);
    }

    public function test_another_users_mission_cannot_be_a_dependency(): void
    {
        $mission = Mission::factory()->create();
        $other = Mission::factory()->create();

        $this->actingAs($mission->user, 'sanctum')
            ->postJson("/api/v1/missions/{$mission->id}/dependencies", ['depends_on_id' => $other->id])
            ->assertJsonValidationErrors(['depends_on_id']);
    }
}
