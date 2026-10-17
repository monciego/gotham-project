<?php

namespace Tests\Feature;

use App\Models\CaseFile;
use App\Models\FocusSession;
use App\Models\Mission;
use App\Models\User;
use Database\Seeders\AchievementsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MissionTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->travelTo('2026-10-17 01:00:00');
        $this->user = User::factory()->create(['timezone' => 'Asia/Manila']);
    }

    public function test_store_requires_a_real_reason(): void
    {
        $this->api('post', '/missions', [...$this->payload(), 'why_it_matters' => 'Because'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['why_it_matters']);

        $this->api('post', '/missions', $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.title', 'Finish the report')
            ->assertJsonPath('data.due_time', '09:30')
            ->assertJsonPath('data.tags', ['work', 'board']);
    }

    public function test_store_rejects_another_users_case(): void
    {
        $case = CaseFile::factory()->create();

        $this->api('post', '/missions', [...$this->payload(), 'case_id' => $case->id])
            ->assertJsonValidationErrors(['case_id']);
    }

    public function test_index_filters_by_view_status_priority_and_search(): void
    {
        $this->mission(['title' => 'Today open', 'priority' => 'high']);
        $this->mission(['title' => 'Today done', 'status' => 'completed']);
        $this->mission(['title' => 'Today abandoned', 'status' => 'abandoned']);
        $this->mission(['title' => 'Tomorrow', 'due_date' => '2026-10-18']);
        $this->mission(['title' => 'Overdue', 'due_date' => '2026-10-10']);
        $this->mission(['title' => 'Overdue but done', 'due_date' => '2026-10-10', 'status' => 'completed']);
        Mission::factory()->create(['title' => 'Someone else']);

        $titles = fn (string $query) => collect($this->api('get', "/missions?{$query}")->json('data.items'))->pluck('title')->sort()->values()->all();

        $this->assertSame(['Today done', 'Today open'], $titles('view=today'));
        $this->assertSame(['Tomorrow'], $titles('view=upcoming'));
        $this->assertSame(['Overdue'], $titles('view=overdue'));
        $this->assertSame(['Overdue', 'Overdue but done', 'Today done', 'Today open', 'Tomorrow'], $titles('view=all'));
        $this->assertSame(['Today abandoned'], $titles('status=abandoned'));
        $this->assertSame(['Today open'], $titles('priority=high'));
        $this->assertSame(['Overdue', 'Overdue but done'], $titles('search=overdue'));
    }

    public function test_index_is_paginated_and_sortable(): void
    {
        $this->mission(['title' => 'Low', 'priority' => 'low']);
        $this->mission(['title' => 'Critical', 'priority' => 'critical']);
        $this->mission(['title' => 'Medium', 'priority' => 'medium', 'times_postponed' => 4]);

        $this->api('get', '/missions?sort=priority&per_page=2')
            ->assertJsonPath('data.items.0.title', 'Critical')
            ->assertJsonPath('data.meta.total', 3)
            ->assertJsonPath('data.meta.last_page', 2);

        $this->api('get', '/missions?sort=times_postponed')->assertJsonPath('data.items.0.title', 'Medium');
    }

    public function test_show_includes_subtasks_sessions_and_dependencies(): void
    {
        $mission = $this->mission([]);
        $blocker = $this->mission(['title' => 'Blocker']);
        $mission->dependencies()->attach($blocker);
        $mission->subtasks()->create(['title' => 'Step one', 'order' => 0]);
        FocusSession::factory()->for($this->user)->for($mission)->create(['duration_minutes' => 25]);

        $this->api('get', "/missions/{$mission->id}")
            ->assertOk()
            ->assertJsonPath('data.subtasks.0.title', 'Step one')
            ->assertJsonPath('data.dependencies.0.title', 'Blocker')
            ->assertJsonPath('data.total_focus_minutes', 25)
            ->assertJsonPath('data.active_session', null);

        $this->api('get', "/missions/{$blocker->id}")->assertJsonPath('data.dependents.0.id', $mission->id);
    }

    public function test_moving_the_due_date_later_counts_as_postponing_and_alfred_speaks_up_at_three(): void
    {
        $mission = $this->mission(['times_postponed' => 1]);

        $this->api('put', "/missions/{$mission->id}", ['due_date' => '2026-10-16'])->assertJsonPath('data.times_postponed', 1);
        $this->api('put', "/missions/{$mission->id}", ['due_date' => '2026-10-20'])->assertJsonPath('data.times_postponed', 2);
        $this->assertSame(0, $this->user->alfredMessages()->count());

        $this->api('put', "/missions/{$mission->id}", ['due_date' => '2026-10-21'])->assertJsonPath('data.times_postponed', 3);

        $message = $this->user->alfredMessages()->sole();
        $this->assertSame('concerned', $message->mood);
        $this->assertSame("/missions/{$mission->id}?breakdown=1", $message->actions[0]['href']);
    }

    public function test_complete_awards_xp_once_trophies_and_case_progress(): void
    {
        $this->seed(AchievementsSeeder::class);
        $case = CaseFile::factory()->for($this->user)->create();
        $mission = $this->mission(['priority' => 'critical', 'case_id' => $case->id]);
        $this->mission(['case_id' => $case->id]);

        $response = $this->api('post', "/missions/{$mission->id}/complete")
            ->assertOk()
            ->assertJsonPath('data.mission.status', 'completed')
            ->assertJsonPath('data.xp_awarded', 100);

        $trophies = collect($response->json('data.achievements'))->pluck('key');
        $this->assertContains('first_mission', $trophies);
        $this->assertNotContains('first_case', $trophies);
        $this->assertSame(50, $case->refresh()->progress);
        // 100 for the mission + trophy XP.
        $this->assertGreaterThan(100, $this->user->refresh()->total_xp);
        $this->assertSame(1, $this->user->alfredMessages()->where('title', 'Trophy unlocked: First Patrol. Well earned, sir.')->count());

        // Reopen and complete again: no more XP.
        $this->api('put', "/missions/{$mission->id}", ['status' => 'not_started'])->assertJsonPath('data.completed_at', null);
        $this->api('post', "/missions/{$mission->id}/complete")->assertJsonPath('data.xp_awarded', 0);
    }

    public function test_levels_follow_xp(): void
    {
        $this->user->gainXp(2450);

        $this->assertSame(3, $this->user->current_level);
    }

    public function test_abandon_needs_a_reason_and_start_needs_an_open_mission(): void
    {
        $mission = $this->mission([]);

        $this->api('post', "/missions/{$mission->id}/start")->assertJsonPath('data.status', 'in_progress');
        $this->api('post', "/missions/{$mission->id}/abandon")->assertJsonValidationErrors(['reason']);
        $this->api('post', "/missions/{$mission->id}/abandon", ['reason' => 'No longer needed'])
            ->assertJsonPath('data.status', 'abandoned')
            ->assertJsonPath('data.abandon_reason', 'No longer needed');
        $this->api('post', "/missions/{$mission->id}/start")->assertJsonValidationErrors(['status']);
    }

    public function test_destroy_soft_deletes(): void
    {
        $mission = $this->mission([]);

        $this->api('delete', "/missions/{$mission->id}")->assertOk();

        $this->assertSoftDeleted($mission);
        $this->api('get', "/missions/{$mission->id}")->assertNotFound();
    }

    public function test_other_users_missions_are_not_found(): void
    {
        $mission = Mission::factory()->create();

        $this->api('get', "/missions/{$mission->id}")->assertNotFound();
        $this->api('put', "/missions/{$mission->id}", ['title' => 'Mine now'])->assertNotFound();
        $this->api('post', "/missions/{$mission->id}/complete")->assertNotFound();
    }

    private function api(string $method, string $uri, array $data = [])
    {
        return $this->actingAs($this->user, 'sanctum')->json($method, "/api/v1{$uri}", $data);
    }

    private function mission(array $attributes): Mission
    {
        return Mission::factory()->for($this->user)->create(['due_date' => '2026-10-17', ...$attributes]);
    }

    /** @return array<string, mixed> */
    private function payload(): array
    {
        return [
            'title' => 'Finish the report',
            'why_it_matters' => 'The board meets on Friday.',
            'priority' => 'high',
            'due_date' => '2026-10-18',
            'due_time' => '09:30',
            'energy_required' => 'high',
            'tags' => ['work', 'board'],
        ];
    }
}
