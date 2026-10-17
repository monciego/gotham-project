<?php

namespace Tests\Feature;

use App\Models\Budget;
use App\Models\Resource;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BudgetTest extends TestCase
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

    public function test_index_shows_spending_against_each_budget(): void
    {
        Budget::factory()->for($this->user)->create(['category' => 'Food', 'monthly_limit' => 400, 'month' => '2026-10-01']);
        Budget::factory()->for($this->user)->create(['category' => 'Transport', 'monthly_limit' => 100, 'month' => '2026-10-01']);
        $this->spend('Food', 300);
        $this->spend('Transport', 120);
        $this->spend('Shopping', 75);

        $this->getJson('/api/v1/budgets')
            ->assertOk()
            ->assertJsonPath('data.carried_over', false)
            ->assertJsonPath('data.budgets.0.category', 'Food')
            ->assertJsonPath('data.budgets.0.spent', 300)
            ->assertJsonPath('data.budgets.0.remaining', 100)
            ->assertJsonPath('data.budgets.0.percentage', 75)
            ->assertJsonPath('data.budgets.1.percentage', 120)
            ->assertJsonPath('data.unbudgeted', [['category' => 'Shopping', 'spent' => 75]])
            ->assertJsonPath('data.total_limit', 500)
            ->assertJsonPath('data.total_spent', 420);
    }

    public function test_months_without_budgets_carry_over_the_latest(): void
    {
        Budget::factory()->for($this->user)->create(['category' => 'Food', 'monthly_limit' => 400, 'month' => '2026-08-01']);

        $this->getJson('/api/v1/budgets')
            ->assertJsonPath('data.carried_over', true)
            ->assertJsonPath('data.from', '2026-08')
            ->assertJsonPath('data.budgets.0.id', null)
            ->assertJsonPath('data.budgets.0.monthly_limit', 400);

        $this->getJson('/api/v1/budgets?month=2026-07')->assertJsonCount(0, 'data.budgets');
    }

    public function test_saving_a_month_replaces_its_set(): void
    {
        Budget::factory()->for($this->user)->create(['category' => 'Food', 'monthly_limit' => 400, 'month' => '2026-10-01']);
        Budget::factory()->for($this->user)->create(['category' => 'Shopping', 'monthly_limit' => 100, 'month' => '2026-10-01']);
        Budget::factory()->for($this->user)->create(['category' => 'Shopping', 'monthly_limit' => 100, 'month' => '2026-09-01']);

        $this->putJson('/api/v1/budgets', ['month' => '2026-10', 'budgets' => [
            ['category' => 'Food', 'monthly_limit' => 450],
            ['category' => 'Health', 'monthly_limit' => 80],
        ]])->assertOk();

        $this->assertEqualsCanonicalizing(
            ['Food' => '450.00', 'Health' => '80.00'],
            $this->user->budgets()->whereDate('month', '2026-10-01')->pluck('monthly_limit', 'category')->all(),
        );
        // Other months are untouched.
        $this->assertSame(1, $this->user->budgets()->whereDate('month', '2026-09-01')->count());

        $this->putJson('/api/v1/budgets', ['budgets' => [['category' => 'Food', 'monthly_limit' => 0]]])->assertJsonValidationErrors(['budgets.0.monthly_limit']);
    }

    public function test_store_and_update_one_budget(): void
    {
        $id = $this->postJson('/api/v1/budgets', ['category' => 'Food', 'monthly_limit' => 300])->assertCreated()->json('data.id');
        $this->postJson('/api/v1/budgets', ['category' => 'Food', 'monthly_limit' => 350])->assertOk()->assertJsonPath('data.id', $id);
        $this->putJson("/api/v1/budgets/{$id}", ['monthly_limit' => 375])->assertOk();

        $this->assertSame('375.00', Budget::find($id)->monthly_limit);
        $this->putJson('/api/v1/budgets/'.Budget::factory()->create()->id, ['monthly_limit' => 1])->assertNotFound();
    }

    public function test_recommendations_average_the_last_three_months(): void
    {
        $this->spend('Food', 300, '2026-07-10');
        $this->spend('Food', 420, '2026-08-10');
        $this->spend('Food', 351, '2026-09-10');
        $this->spend('Transport', 30, '2026-09-12');
        // Older than three months and this month don't count.
        $this->spend('Food', 5000, '2026-06-10');
        $this->spend('Food', 5000, '2026-10-02');

        $this->getJson('/api/v1/budgets/recommendations')
            ->assertOk()
            ->assertJsonPath('data', [
                ['category' => 'Food', 'average' => 357, 'suggested' => 360],
                ['category' => 'Transport', 'average' => 10, 'suggested' => 10],
            ]);
    }

    private function spend(string $category, float $amount, string $date = '2026-10-10'): void
    {
        Resource::factory()->for($this->user)->create(['category' => $category, 'amount' => $amount, 'date' => $date]);
    }
}
