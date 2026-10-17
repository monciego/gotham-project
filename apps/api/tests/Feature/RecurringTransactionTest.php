<?php

namespace Tests\Feature;

use App\Jobs\RecurringTransactionJob;
use App\Models\Resource;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RecurringTransactionTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->travelTo('2026-10-17 01:00:00');
        $this->user = User::factory()->create(['timezone' => 'Asia/Manila']);
    }

    public function test_the_job_adds_copies_that_have_fallen_due_once(): void
    {
        $rent = $this->template(['category' => 'Housing', 'amount' => 1500, 'date' => '2026-08-01', 'recurring_frequency' => 'monthly']);
        $gym = $this->template(['category' => 'Health', 'amount' => 20, 'date' => '2026-10-03', 'recurring_frequency' => 'weekly']);

        RecurringTransactionJob::dispatchSync();
        RecurringTransactionJob::dispatchSync();

        $this->assertSame(['2026-09-01', '2026-10-01'], $this->copyDates($rent));
        $this->assertSame(['2026-10-10', '2026-10-17'], $this->copyDates($gym));

        $copy = $rent->occurrences()->first();
        $this->assertFalse($copy->recurring);
        $this->assertNull($copy->recurring_frequency);
        $this->assertSame('1500.00', $copy->amount);
    }

    public function test_monthly_dates_count_from_the_original_day(): void
    {
        $this->travelTo('2027-03-31 01:00:00');
        $bill = $this->template(['date' => '2027-01-31', 'recurring_frequency' => 'monthly']);

        RecurringTransactionJob::dispatchSync();

        $this->assertSame(['2027-02-28', '2027-03-31'], $this->copyDates($bill));
    }

    public function test_stopping_a_recurrence_stops_new_copies(): void
    {
        $bill = $this->template(['date' => '2026-10-15', 'recurring_frequency' => 'daily']);
        RecurringTransactionJob::dispatchSync();
        $this->assertCount(2, $this->copyDates($bill));

        $bill->update(['recurring' => false]);
        $this->travel(3)->days();
        RecurringTransactionJob::dispatchSync();

        $this->assertCount(2, $this->copyDates($bill));
    }

    public function test_logging_a_past_recurring_transaction_catches_up_straight_away(): void
    {
        $this->actingAs($this->user, 'sanctum')->postJson('/api/v1/resources', [
            'type' => 'income',
            'amount' => 4000,
            'category' => 'Salary',
            'date' => '2026-09-15',
            'recurring' => true,
            'recurring_frequency' => 'monthly',
        ])->assertCreated();

        $this->assertDatabaseHas('resources', ['date' => '2026-10-15 00:00:00', 'category' => 'Salary', 'recurring' => false]);
    }

    public function test_the_job_is_scheduled_daily(): void
    {
        $this->artisan('schedule:list')->expectsOutputToContain('RecurringTransactionJob')->assertSuccessful();
    }

    private function template(array $attributes): Resource
    {
        return Resource::factory()->for($this->user)->create(['recurring' => true, ...$attributes]);
    }

    /** @return list<string> */
    private function copyDates(Resource $template): array
    {
        return $template->occurrences()->orderBy('date')->pluck('date')->map->toDateString()->all();
    }
}
