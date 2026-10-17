<?php

namespace Tests\Feature;

use App\Models\Resource;
use App\Models\SavingsGoal;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SavingsGoalTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->travelTo('2026-10-17 01:00:00');
        $this->user = User::factory()->create(['timezone' => 'Asia/Manila']);
        $this->actingAs($this->user, 'sanctum');
    }

    public function test_creating_a_goal(): void
    {
        $this->postJson('/api/v1/savings-goals', ['name' => 'New cowl', 'target_amount' => 2000, 'deadline' => '2026-12-31'])
            ->assertCreated()
            ->assertJsonPath('data.current_amount', 0)
            ->assertJsonPath('data.percentage', 0)
            ->assertJsonPath('data.days_left', 75)
            ->assertJsonPath('data.on_track', true);

        $this->postJson('/api/v1/savings-goals', ['name' => '', 'target_amount' => 0, 'deadline' => '2026-10-01'])
            ->assertJsonValidationErrors(['name', 'target_amount', 'deadline']);
    }

    public function test_contributions_fill_the_goal_and_completing_it_tells_alfred(): void
    {
        $goal = SavingsGoal::factory()->for($this->user)->create(['name' => 'Cave upgrade', 'target_amount' => 500]);
        $existing = Resource::factory()->for($this->user)->create(['amount' => 200, 'category' => 'Transfer']);

        $this->contribute($goal, ['resource_id' => $existing->id])
            ->assertOk()
            ->assertJsonPath('data.goal.current_amount', 200)
            ->assertJsonPath('data.completed_now', false);

        $this->contribute($goal, ['amount' => 300, 'account' => 'Savings'])
            ->assertJsonPath('data.goal.current_amount', 500)
            ->assertJsonPath('data.goal.completed', true)
            ->assertJsonPath('data.goal.contributions.0.category', 'Savings')
            ->assertJsonPath('data.goal.contributions.0.description', 'Toward Cave upgrade')
            ->assertJsonPath('data.completed_now', true);

        $this->assertDatabaseHas('alfred_messages', ['title' => 'Goal reached: Cave upgrade']);

        // Taking money back out reopens it.
        $this->deleteJson("/api/v1/savings-goals/{$goal->id}/contributions/{$existing->id}")
            ->assertOk()
            ->assertJsonPath('data.current_amount', 300)
            ->assertJsonPath('data.completed', false);
        $this->assertModelExists($existing);
    }

    public function test_a_transaction_counts_toward_one_goal_and_deleting_it_updates_the_goal(): void
    {
        $first = SavingsGoal::factory()->for($this->user)->create();
        $second = SavingsGoal::factory()->for($this->user)->create();
        $resource = Resource::factory()->for($this->user)->create(['amount' => 100]);

        $this->contribute($first, ['resource_id' => $resource->id])->assertOk();
        $this->contribute($second, ['resource_id' => $resource->id])->assertJsonValidationErrors(['resource_id']);
        $this->contribute($second, ['resource_id' => Resource::factory()->create()->id])->assertNotFound();

        $this->getJson('/api/v1/resources?unlinked=1')->assertJsonCount(0, 'data.items');
        $this->deleteJson("/api/v1/resources/{$resource->id}")->assertOk();
        $this->assertSame('0.00', $first->refresh()->current_amount);
    }

    public function test_on_track_compares_savings_with_an_even_pace_to_the_deadline(): void
    {
        $this->travelTo('2026-09-17 01:00:00');
        $goal = SavingsGoal::factory()->for($this->user)->create(['target_amount' => 1000, 'deadline' => '2026-11-16']);
        $this->travelTo('2026-10-17 01:00:00');
        Resource::factory()->for($this->user)->create(['amount' => 400, 'savings_goal_id' => $goal->id]);
        $goal->recalculate();

        // Halfway through the time, 500 expected, 400 saved.
        $this->getJson("/api/v1/savings-goals/{$goal->id}")
            ->assertJsonPath('data.expected_amount', 500)
            ->assertJsonPath('data.on_track', false)
            ->assertJsonPath('data.percentage', 40);
    }

    public function test_index_splits_active_and_completed_goals(): void
    {
        SavingsGoal::factory()->for($this->user)->create(['name' => 'Later', 'deadline' => '2027-06-01']);
        SavingsGoal::factory()->for($this->user)->create(['name' => 'Someday']);
        SavingsGoal::factory()->for($this->user)->create(['name' => 'Soon', 'deadline' => '2026-11-01']);
        $done = SavingsGoal::factory()->for($this->user)->create(['name' => 'Done', 'target_amount' => 10]);
        Resource::factory()->for($this->user)->create(['amount' => 10, 'savings_goal_id' => $done->id]);
        $done->recalculate();
        SavingsGoal::factory()->create();

        $response = $this->getJson('/api/v1/savings-goals')->assertOk();

        $this->assertSame(['Soon', 'Later', 'Someday'], collect($response->json('data.active'))->pluck('name')->all());
        $this->assertSame(['Done'], collect($response->json('data.completed'))->pluck('name')->all());
    }

    public function test_updating_and_deleting_a_goal(): void
    {
        $goal = SavingsGoal::factory()->for($this->user)->create(['target_amount' => 1000]);
        $resource = Resource::factory()->for($this->user)->create(['amount' => 600, 'savings_goal_id' => $goal->id]);

        $this->putJson("/api/v1/savings-goals/{$goal->id}", ['target_amount' => 500])->assertJsonPath('data.completed', true);
        $this->deleteJson("/api/v1/savings-goals/{$goal->id}")->assertOk();

        $this->assertNull($resource->refresh()->savings_goal_id);
        $this->deleteJson('/api/v1/savings-goals/'.SavingsGoal::factory()->create()->id)->assertNotFound();
    }

    private function contribute(SavingsGoal $goal, array $data)
    {
        return $this->postJson("/api/v1/savings-goals/{$goal->id}/contributions", $data);
    }
}
