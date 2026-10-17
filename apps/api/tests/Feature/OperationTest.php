<?php

namespace Tests\Feature;

use App\Models\Arsenal;
use App\Models\Mission;
use App\Models\Operation;
use App\Models\SystemIntelligence;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OperationTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        // Saturday 17 October 2026, 09:00 in Manila (UTC+8).
        $this->travelTo('2026-10-17 01:00:00');
        $this->user = User::factory()->create(['timezone' => 'Asia/Manila', 'current_mode' => 'bruce']);
        $this->actingAs($this->user, 'sanctum');
    }

    public function test_creating_a_timed_event_reads_local_times_and_returns_utc(): void
    {
        $this->postJson('/api/v1/operations', [
            'title' => 'Board meeting',
            'start' => '2026-10-19T14:00:00',
            'end' => '2026-10-19T15:30:00+08:00',
            'category' => 'work',
            'color' => 'blue',
            'reminder_minutes' => 15,
        ])
            ->assertCreated()
            ->assertJsonPath('data.start', '2026-10-19T06:00:00Z')
            ->assertJsonPath('data.end', '2026-10-19T07:30:00Z')
            ->assertJsonPath('data.kind', 'event')
            ->assertJsonPath('data.reminder_minutes', 15);

        $this->postJson('/api/v1/operations', ['title' => '', 'start' => '2026-10-19T14:00:00', 'end' => '2026-10-19T13:00:00', 'category' => 'chores', 'color' => 'gold', 'reminder_minutes' => 5])
            ->assertJsonValidationErrors(['title', 'category', 'color', 'reminder_minutes']);
        $this->postJson('/api/v1/operations', ['title' => 'Backwards', 'start' => '2026-10-19T14:00:00', 'end' => '2026-10-19T13:00:00', 'category' => 'work'])
            ->assertJsonValidationErrors(['end']);
    }

    public function test_all_day_events_use_dates_with_an_exclusive_end(): void
    {
        $this->postJson('/api/v1/operations', [
            'title' => 'Wayne Foundation gala',
            'all_day' => true,
            'start' => '2026-10-20',
            'end' => '2026-10-22',
            'category' => 'social',
        ])
            ->assertCreated()
            ->assertJsonPath('data.start', '2026-10-20')
            ->assertJsonPath('data.end', '2026-10-22')
            ->assertJsonPath('data.all_day', true);

        $this->assertSame('2026-10-19 16:00:00', Operation::sole()->start_time->toDateTimeString());
        $this->postJson('/api/v1/operations', ['title' => 'x', 'all_day' => true, 'start' => '2026-10-20T10:00', 'end' => '2026-10-21', 'category' => 'work'])
            ->assertJsonValidationErrors(['start']);
    }

    public function test_index_returns_what_overlaps_the_range(): void
    {
        $this->event('Inside', '2026-10-19 02:00:00', '2026-10-19 03:00:00');
        $this->event('Spans the start', '2026-10-18 15:00:00', '2026-10-18 17:00:00');
        $this->event('Before', '2026-10-17 02:00:00', '2026-10-17 03:00:00');
        $this->event('After', '2026-10-26 02:00:00', '2026-10-26 03:00:00');
        Operation::factory()->create(['start_time' => '2026-10-19 02:00:00', 'end_time' => '2026-10-19 03:00:00']);

        // Monday 19 to Monday 26 October, Manila.
        $titles = collect($this->getJson('/api/v1/operations?start=2026-10-19&end=2026-10-26')->assertOk()->json('data'))->pluck('title')->all();

        $this->assertSame(['Spans the start', 'Inside'], $titles);
        $this->getJson('/api/v1/operations?start=2026-01-01&end=2026-12-31')->assertJsonValidationErrors(['end']);
    }

    public function test_recurring_events_expand_into_occurrences_until_their_end(): void
    {
        $this->event('Training', '2026-10-05 23:00:00', '2026-10-06 00:00:00', [
            'recurring' => true,
            'recurring_rule' => ['freq' => 'weekly', 'until' => '2026-10-27'],
        ]);

        $entries = $this->getJson('/api/v1/operations?start=2026-10-01&end=2026-11-30')->json('data');

        // Tuesdays at 07:00 in Manila: the 6th, 13th, 20th and 27th.
        $this->assertSame(
            ['2026-10-05T23:00:00Z', '2026-10-12T23:00:00Z', '2026-10-19T23:00:00Z', '2026-10-26T23:00:00Z'],
            array_column($entries, 'start'),
        );
        $this->assertSame(['op-1-0', 'op-1-1', 'op-1-2', 'op-1-3'], array_column($entries, 'id'));
        $this->assertSame('2026-10-05T23:00:00Z', $entries[3]['series_start']);
    }

    public function test_a_long_running_daily_series_still_reaches_far_ranges(): void
    {
        $this->event('Stand-up', '2024-01-01 01:00:00', '2024-01-01 01:15:00', ['recurring' => true, 'recurring_rule' => ['freq' => 'daily']]);

        $this->assertCount(7, $this->getJson('/api/v1/operations?start=2026-10-19&end=2026-10-26')->json('data'));
    }

    public function test_habits_with_a_reminder_show_on_their_days_read_only(): void
    {
        Arsenal::factory()->for($this->user)->create(['name' => 'Morning run', 'reminder_time' => '06:30', 'created_at' => '2026-09-01']);
        Arsenal::factory()->for($this->user)->create(['name' => 'Gym', 'type' => 'specific_days', 'frequency' => ['days' => [1, 3]], 'reminder_time' => '18:00', 'created_at' => '2026-09-01']);
        Arsenal::factory()->for($this->user)->create(['name' => 'No reminder', 'created_at' => '2026-09-01']);
        Arsenal::factory()->for($this->user)->create(['name' => 'Batman only', 'reminder_time' => '07:00', 'mode_specific' => ['batman'], 'created_at' => '2026-09-01']);

        $entries = collect($this->getJson('/api/v1/operations?start=2026-10-19&end=2026-10-21')->json('data'));

        $this->assertSame(['Morning run', 'Gym', 'Morning run'], $entries->pluck('title')->all());
        $this->assertSame(['habit', false, '2026-10-18T22:30:00Z'], [$entries[0]['kind'], $entries[0]['editable'], $entries[0]['start']]);
    }

    public function test_linking_a_mission_sets_its_due_time(): void
    {
        $mission = Mission::factory()->for($this->user)->create(['due_time' => null]);

        $id = $this->postJson('/api/v1/operations', [
            'title' => $mission->title,
            'start' => '2026-10-18T14:00:00',
            'end' => '2026-10-18T16:00:00',
            'category' => 'work',
            'mission_id' => $mission->id,
        ])->assertCreated()->assertJsonPath('data.mission.id', $mission->id)->json('data.operation_id');

        $this->assertSame('14:00', substr($mission->refresh()->due_time, 0, 5));

        // Dragging it later moves the due time too.
        $this->putJson("/api/v1/operations/{$id}", ['start' => '2026-10-18T16:30:00', 'end' => '2026-10-18T18:30:00'])->assertOk();
        $this->assertSame('16:30', substr($mission->refresh()->due_time, 0, 5));

        $this->postJson('/api/v1/operations', [
            'title' => 'x', 'start' => '2026-10-18T14:00:00', 'end' => '2026-10-18T15:00:00', 'category' => 'work',
            'mission_id' => Mission::factory()->create()->id,
        ])->assertJsonValidationErrors(['mission_id']);
    }

    public function test_updating_and_deleting(): void
    {
        $operation = $this->event('Lunch', '2026-10-19 04:00:00', '2026-10-19 05:00:00');

        $this->putJson("/api/v1/operations/{$operation->id}", ['title' => 'Lunch with Lucius', 'recurring' => true, 'recurring_rule' => ['freq' => 'monthly']])
            ->assertOk()
            ->assertJsonPath('data.title', 'Lunch with Lucius')
            ->assertJsonPath('data.start', '2026-10-19T04:00:00Z')
            ->assertJsonPath('data.recurring_rule', ['freq' => 'monthly']);
        $this->putJson("/api/v1/operations/{$operation->id}", ['recurring' => false])->assertJsonPath('data.recurring_rule', null);
        // Times go together.
        $this->putJson("/api/v1/operations/{$operation->id}", ['start' => '2026-10-19T13:00:00'])->assertJsonValidationErrors(['end']);

        $this->deleteJson("/api/v1/operations/{$operation->id}")->assertOk();
        $this->assertModelMissing($operation);

        $theirs = Operation::factory()->create();
        $this->getJson("/api/v1/operations/{$theirs->id}")->assertNotFound();
        $this->putJson("/api/v1/operations/{$theirs->id}", ['title' => 'Mine'])->assertNotFound();
    }

    public function test_a_focus_block_goes_an_hour_into_the_working_day(): void
    {
        $this->user->update(['work_start_time' => '08:00']);

        $this->postJson('/api/v1/operations/focus-block', ['date' => '2026-10-19'])
            ->assertCreated()
            ->assertJsonPath('data.reason', 'work_start')
            ->assertJsonPath('data.moved', false)
            ->assertJsonPath('data.operation.title', '🎯 Focus Block')
            ->assertJsonPath('data.operation.kind', 'focus_block')
            ->assertJsonPath('data.operation.start', '2026-10-19T01:00:00Z')
            ->assertJsonPath('data.operation.end', '2026-10-19T03:00:00Z');
    }

    public function test_a_focus_block_prefers_the_energy_peak_and_dodges_other_events(): void
    {
        $pattern = new SystemIntelligence(['pattern_type' => 'energy_pattern', 'pattern_data' => ['peak_hour' => 14], 'confidence' => 0.8]);
        $pattern->user_id = $this->user->id;
        $pattern->save();
        // 14:30 to 15:30 in Manila is taken, so 15:30 is the first free 2 hours.
        $this->event('Call', '2026-10-19 06:30:00', '2026-10-19 07:30:00');

        $this->postJson('/api/v1/operations/focus-block', ['date' => '2026-10-19'])
            ->assertJsonPath('data.reason', 'energy_pattern')
            ->assertJsonPath('data.moved', true)
            ->assertJsonPath('message', 'That time was spoken for or past, sir, so I found the next free two hours.')
            ->assertJsonPath('data.operation.start', '2026-10-19T07:30:00Z');
    }

    public function test_a_focus_block_today_never_starts_in_the_past(): void
    {
        $mission = Mission::factory()->for($this->user)->create(['status' => 'not_started']);

        // 10:00 default has passed at 11:10 Manila; the next half hour is 11:30.
        $this->travelTo('2026-10-17 03:10:00');
        $this->postJson('/api/v1/operations/focus-block', ['mission_id' => $mission->id])
            ->assertJsonPath('data.reason', 'default')
            ->assertJsonPath('data.operation.start', '2026-10-17T03:30:00Z')
            ->assertJsonPath('data.operation.mission.id', $mission->id);

        $done = Mission::factory()->for($this->user)->create(['status' => 'completed']);
        $this->postJson('/api/v1/operations/focus-block', ['mission_id' => $done->id])->assertJsonValidationErrors(['mission_id']);
        $this->postJson('/api/v1/operations/focus-block', ['date' => '2026-10-16'])->assertJsonValidationErrors(['date']);
    }

    private function event(string $title, string $start, string $end, array $attributes = []): Operation
    {
        return Operation::factory()->for($this->user)->create(['title' => $title, 'start_time' => $start, 'end_time' => $end, ...$attributes]);
    }
}
