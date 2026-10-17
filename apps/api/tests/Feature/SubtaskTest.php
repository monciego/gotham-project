<?php

namespace Tests\Feature;

use App\Models\Mission;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubtaskTest extends TestCase
{
    use RefreshDatabase;

    public function test_subtasks_can_be_added_toggled_reordered_and_deleted(): void
    {
        $mission = Mission::factory()->create();
        $user = $mission->user;
        $base = "/api/v1/missions/{$mission->id}/subtasks";

        $first = $this->actingAs($user, 'sanctum')->postJson($base, ['title' => 'Open the document'])
            ->assertCreated()->json('data.id');
        $second = $this->postJson($base, ['title' => 'Write the outline'])->assertJsonPath('data.order', 2)->json('data.id');

        $this->putJson("{$base}/{$first}", ['completed' => true])->assertJsonPath('data.completed', true);

        $this->postJson("{$base}/reorder", ['ids' => [$second]])->assertJsonValidationErrors(['ids']);
        $this->postJson("{$base}/reorder", ['ids' => [$second, $first]])
            ->assertOk()
            ->assertJsonPath('data.0.id', $second)
            ->assertJsonPath('data.1.id', $first);

        $this->deleteJson("{$base}/{$first}")->assertOk();
        $this->getJson($base)->assertJsonCount(1, 'data');
    }

    public function test_other_users_subtasks_are_not_found(): void
    {
        $mission = Mission::factory()->create();
        $subtask = $mission->subtasks()->create(['title' => 'Secret', 'order' => 0]);

        $this->actingAs(User::factory()->create(), 'sanctum')
            ->putJson("/api/v1/missions/{$mission->id}/subtasks/{$subtask->id}", ['completed' => true])
            ->assertNotFound();
    }
}
