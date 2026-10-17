<?php

namespace Tests\Feature;

use App\Models\Budget;
use App\Models\Resource;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResourceTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        // Saturday 17 October 2026, 09:00 in Manila.
        $this->travelTo('2026-10-17 01:00:00');
        $this->user = User::factory()->create(['timezone' => 'Asia/Manila']);
        $this->actingAs($this->user, 'sanctum');
    }

    public function test_logging_a_transaction(): void
    {
        $this->postJson('/api/v1/resources', [
            'type' => 'expense',
            'amount' => 12.5,
            'category' => '  Food ',
            'description' => 'Lunch with Lucius',
            'date' => '2026-10-17',
            'account' => 'Visa',
        ])
            ->assertCreated()
            ->assertJsonPath('message', 'Expense logged, sir.')
            ->assertJsonPath('data.amount', 12.5)
            ->assertJsonPath('data.category', 'Food')
            ->assertJsonPath('data.recurring', false);

        $this->postJson('/api/v1/resources', ['type' => 'gift', 'amount' => -3, 'date' => '17/10/2026'])
            ->assertJsonValidationErrors(['type', 'amount', 'category', 'date']);
        $this->postJson('/api/v1/resources', ['type' => 'expense', 'amount' => 1.234, 'category' => 'Food', 'date' => '2026-10-17', 'recurring' => true])
            ->assertJsonValidationErrors(['amount', 'recurring_frequency']);
    }

    public function test_going_over_a_budget_alerts_once_per_category_and_month(): void
    {
        Budget::factory()->for($this->user)->create(['category' => 'Food', 'monthly_limit' => 100, 'month' => '2026-10-01']);

        $this->expense(60);
        $this->assertDatabaseCount('alfred_messages', 0);

        $this->expense(50);
        $this->expense(20);
        $this->assertDatabaseHas('alfred_messages', [
            'title' => 'Over budget: Food, October 2026',
            'message' => "You've spent $110.00 of your $100.00 Food budget, sir. Perhaps we tighten the belt until month's end.",
        ]);
        $this->assertSame(1, $this->user->alfredMessages()->count());

        // Income never trips a budget.
        $this->postJson('/api/v1/resources', ['type' => 'income', 'amount' => 999, 'category' => 'Food', 'date' => '2026-10-17']);
        $this->assertSame(1, $this->user->alfredMessages()->count());
    }

    public function test_budgets_carry_over_to_months_without_their_own(): void
    {
        Budget::factory()->for($this->user)->create(['category' => 'Food', 'monthly_limit' => 100, 'month' => '2026-08-01']);

        $this->expense(150);

        $this->assertDatabaseHas('alfred_messages', ['title' => 'Over budget: Food, October 2026']);
    }

    public function test_index_filters_searches_and_sorts(): void
    {
        $this->expense(30, ['description' => 'Groceries', 'date' => '2026-10-02', 'account' => 'Visa']);
        $this->expense(80, ['category' => 'Transport', 'description' => 'Train pass', 'date' => '2026-10-10']);
        $this->expense(5, ['description' => 'Coffee', 'date' => '2026-09-28']);
        Resource::factory()->for($this->user)->income()->create(['amount' => 4000, 'date' => '2026-10-01']);
        Resource::factory()->create();

        $this->getJson('/api/v1/resources')->assertJsonPath('data.meta.total', 4)->assertJsonPath('data.items.0.description', 'Train pass');
        $this->getJson('/api/v1/resources?type=income')->assertJsonCount(1, 'data.items');
        $this->getJson('/api/v1/resources?category=Transport')->assertJsonCount(1, 'data.items');
        $this->getJson('/api/v1/resources?account=Visa')->assertJsonCount(1, 'data.items');
        $this->getJson('/api/v1/resources?from=2026-10-01&to=2026-10-31&type=expense')->assertJsonCount(2, 'data.items');
        $this->getJson('/api/v1/resources?search=train')->assertJsonCount(1, 'data.items');
        $this->getJson('/api/v1/resources?sort=amount')->assertJsonPath('data.items.0.amount', 4000);
        $this->getJson('/api/v1/resources?sort=amount&direction=asc')->assertJsonPath('data.items.0.amount', 5);
    }

    public function test_summary_totals_the_month_and_the_six_before(): void
    {
        Resource::factory()->for($this->user)->income()->create(['amount' => 5000, 'date' => '2026-10-01']);
        $this->expense(300, ['date' => '2026-10-03']);
        $this->expense(1200, ['category' => 'Housing', 'date' => '2026-10-05']);
        $this->expense(400, ['date' => '2026-08-15']);

        $this->getJson('/api/v1/resources/summary')
            ->assertOk()
            ->assertJsonPath('data.month', '2026-10')
            ->assertJsonPath('data.income', 5000)
            ->assertJsonPath('data.expenses', 1500)
            ->assertJsonPath('data.net', 3500)
            ->assertJsonPath('data.by_category', [['category' => 'Housing', 'amount' => 1200], ['category' => 'Food', 'amount' => 300]])
            ->assertJsonCount(6, 'data.history')
            ->assertJsonPath('data.history.0.month', '2026-05')
            ->assertJsonPath('data.history.3', ['month' => '2026-08', 'income' => 0, 'expenses' => 400]);
    }

    public function test_categories_are_the_defaults_then_the_users_own(): void
    {
        $this->expense(10, ['category' => 'Batmobile fuel']);
        $this->expense(10, ['category' => 'Food']);

        $response = $this->getJson('/api/v1/resources/categories')->assertOk();

        $this->assertSame([...Resource::DEFAULT_CATEGORIES['expense'], 'Batmobile fuel'], $response->json('data.expense'));
        $this->assertSame(Resource::DEFAULT_CATEGORIES['income'], $response->json('data.income'));
    }

    public function test_bulk_delete_only_touches_your_own(): void
    {
        $mine = $this->expense(10);
        $also = $this->expense(20);
        $theirs = Resource::factory()->create();

        $this->postJson('/api/v1/resources/bulk-delete', ['ids' => [$mine, $also, $theirs->id]])
            ->assertOk()
            ->assertJsonPath('data.deleted', 2);

        $this->assertModelExists($theirs);
        $this->deleteJson("/api/v1/resources/{$theirs->id}")->assertNotFound();
    }

    public function test_export_is_csv_of_the_filtered_transactions(): void
    {
        $this->expense(12.5, ['description' => 'Lunch, with Lucius']);
        Resource::factory()->for($this->user)->income()->create(['amount' => 100, 'description' => 'Refund']);

        $csv = $this->get('/api/v1/resources/export?type=expense')->assertOk()->streamedContent();

        $this->assertSame(
            "Date,Type,Description,Category,Account,Amount\n2026-10-17,expense,\"Lunch, with Lucius\",Food,,-12.50\n",
            $csv,
        );
    }

    private function expense(float $amount, array $overrides = []): int
    {
        return $this->postJson('/api/v1/resources', [
            'type' => 'expense',
            'amount' => $amount,
            'category' => 'Food',
            'date' => '2026-10-17',
            ...$overrides,
        ])->assertCreated()->json('data.id');
    }
}
