<?php

namespace Tests\Feature;

use App\Models\CaseFile;
use App\Models\FocusSession;
use App\Models\Mission;
use App\Models\User;
use Database\Seeders\AchievementsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CaseTest extends TestCase
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

    private function case(array $attributes = []): CaseFile
    {
        return CaseFile::factory()->for($this->user)->create($attributes);
    }

    private function mission(CaseFile $case, string $status = 'not_started', array $attributes = []): Mission
    {
        return Mission::factory()->for($this->user)->create([
            'case_id' => $case->id,
            'status' => $status,
            'completed_at' => $status === 'completed' ? now() : null,
            ...$attributes,
        ]);
    }

    public function test_a_case_is_opened_with_clean_notes(): void
    {
        $this->postJson('/api/v1/cases', [
            'name' => 'Take down the Falcone family',
            'start_date' => '2026-10-17',
            'target_end_date' => '2026-12-31',
            'color' => 'purple',
            'tags' => ['crime', 'docks'],
            'notes' => '<p onclick="x()">Follow <strong>the money</strong></p><script>alert(1)</script>',
        ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'planning')
            ->assertJsonPath('data.progress', 0)
            ->assertJsonPath('data.progress_mode', 'auto')
            ->assertJsonPath('data.notes', '<p>Follow <strong>the money</strong></p>')
            ->assertJsonPath('data.missions_total', 0)
            ->assertJsonPath('data.analytics.progress_history', [['date' => '2026-10-17', 'progress' => 0]]);
    }

    public function test_validation(): void
    {
        $this->postJson('/api/v1/cases', ['start_date' => '2026-10-17'])->assertJsonValidationErrors(['name']);
        $this->postJson('/api/v1/cases', ['name' => 'X', 'start_date' => '2026-10-17', 'color' => 'gold'])->assertJsonValidationErrors(['color']);
        $this->postJson('/api/v1/cases', ['name' => 'X', 'start_date' => '2026-10-17', 'status' => 'completed'])->assertJsonValidationErrors(['status']);
        $this->postJson('/api/v1/cases', ['name' => 'X', 'start_date' => '2026-10-17', 'target_end_date' => '2026-10-16'])
            ->assertJsonValidationErrors(['target_end_date']);

        // The saved start date counts on updates.
        $case = $this->case(['start_date' => '2026-10-10']);
        $this->putJson("/api/v1/cases/{$case->id}", ['target_end_date' => '2026-10-09'])->assertJsonValidationErrors(['target_end_date']);
        $this->putJson("/api/v1/cases/{$case->id}", ['target_end_date' => '2026-10-11'])->assertOk();
    }

    public function test_index_lists_counts_and_schedule_active_first(): void
    {
        $done = $this->case(['name' => 'Closed', 'status' => 'completed']);
        $behind = $this->case(['name' => 'Behind', 'start_date' => '2026-10-01', 'target_end_date' => '2026-10-21']);
        $this->case(['name' => 'Planned', 'status' => 'planning']);
        $this->mission($behind, 'completed');
        $this->mission($behind);
        $this->mission($behind, 'abandoned');
        $this->mission($done, 'completed');
        CaseFile::factory()->create();

        $this->getJson('/api/v1/cases')
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('data.0.name', 'Behind')
            ->assertJsonPath('data.0.missions_total', 2)
            ->assertJsonPath('data.0.missions_completed', 1)
            // 16 of 20 days gone means 80% expected; it has 0 (auto progress isn't recalculated by factories).
            ->assertJsonPath('data.0.schedule', 'behind')
            ->assertJsonPath('data.1.name', 'Planned')
            ->assertJsonPath('data.1.schedule', null)
            ->assertJsonPath('data.2.name', 'Closed');

        $this->getJson('/api/v1/cases?status=open')->assertJsonCount(2, 'data');
        $this->getJson('/api/v1/cases?status=completed')->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'Closed');
    }

    public function test_completing_missions_moves_auto_progress_and_alfred_celebrates_each_mark_once(): void
    {
        $case = $this->case(['name' => 'Arkham breakout']);
        $missions = collect(range(1, 4))->map(fn () => $this->mission($case));

        $this->postJson("/api/v1/missions/{$missions[0]->id}/complete")
            ->assertJsonPath('data.case_milestone', ['case_id' => $case->id, 'name' => 'Arkham breakout', 'milestone' => 25]);
        $this->postJson("/api/v1/missions/{$missions[1]->id}/complete")->assertJsonPath('data.case_milestone.milestone', 50);

        $this->assertSame(50, $case->refresh()->progress);
        $this->assertDatabaseHas('alfred_messages', [
            'title' => 'Arkham breakout: 50%',
            'message' => 'Halfway there, sir. The case is turning in our favor.',
        ]);

        // Dropping below and coming back doesn't celebrate again.
        $this->putJson("/api/v1/missions/{$missions[1]->id}", ['status' => 'not_started']);
        $this->assertSame(25, $case->refresh()->progress);
        $this->postJson("/api/v1/missions/{$missions[1]->id}/complete")->assertJsonPath('data.case_milestone', null);
        $this->assertSame(1, $this->user->alfredMessages()->where('title', 'Arkham breakout: 50%')->count());

        // Abandoning the rest finishes the case: abandoned missions don't count.
        $this->postJson("/api/v1/missions/{$missions[2]->id}/abandon", ['reason' => 'Not needed']);
        $this->postJson("/api/v1/missions/{$missions[3]->id}/abandon", ['reason' => 'Not needed']);
        $this->assertSame(100, $case->refresh()->progress);
        $this->assertDatabaseHas('alfred_messages', ['title' => 'Arkham breakout: 100%']);

        // One snapshot a day, the latest progress.
        $this->assertSame(1, $case->progressLogs()->count());
        $this->assertSame(100, $case->progressLogs()->sole()->progress);
    }

    public function test_manual_progress_is_only_for_manual_cases(): void
    {
        $auto = $this->case();
        $manual = $this->case(['progress_mode' => 'manual', 'name' => 'Rebuild the Batcave']);

        $this->patchJson("/api/v1/cases/{$auto->id}/progress", ['progress' => 40])->assertJsonValidationErrors(['progress']);
        $this->patchJson("/api/v1/cases/{$manual->id}/progress", ['progress' => 101])->assertJsonValidationErrors(['progress']);

        $this->patchJson("/api/v1/cases/{$manual->id}/progress", ['progress' => 55])
            ->assertOk()
            ->assertJsonPath('data.case.progress', 55)
            ->assertJsonPath('data.milestone', 50);

        // Switching to auto recounts from the missions.
        $this->mission($manual, 'completed');
        $this->mission($manual);
        $this->mission($manual);
        $this->putJson("/api/v1/cases/{$manual->id}", ['progress_mode' => 'auto'])->assertJsonPath('data.progress', 33);
    }

    public function test_completing_a_case_awards_xp_once_and_a_trophy(): void
    {
        $this->seed(AchievementsSeeder::class);
        $case = $this->case(['name' => 'The Long Halloween']);

        $response = $this->postJson("/api/v1/cases/{$case->id}/complete")
            ->assertOk()
            ->assertJsonPath('message', 'Case closed. Batman would be proud.')
            ->assertJsonPath('data.case.status', 'completed')
            ->assertJsonPath('data.case.actual_end_date', '2026-10-17')
            ->assertJsonPath('data.xp_awarded', 500);

        $this->assertContains('first_case', collect($response->json('data.achievements'))->pluck('key'));
        $this->assertDatabaseHas('alfred_messages', [
            'type' => 'case_closed',
            'title' => 'Case closed.',
            'message' => "'The Long Halloween' is complete, sir. Another victory for Gotham. Batman would be proud.",
        ]);
        $this->postJson("/api/v1/cases/{$case->id}/complete")->assertJsonValidationErrors(['status']);

        // Reopening clears the end date; closing again grants no more XP.
        $this->putJson("/api/v1/cases/{$case->id}", ['status' => 'active'])
            ->assertJsonPath('data.status', 'active')
            ->assertJsonPath('data.actual_end_date', null);
        $this->postJson("/api/v1/cases/{$case->id}/complete")->assertJsonPath('data.xp_awarded', 0);
    }

    public function test_show_has_missions_milestones_and_analytics(): void
    {
        $case = $this->case(['start_date' => '2026-10-03']);
        $done = $this->mission($case, 'completed');
        $this->mission($case, 'not_started', ['due_date' => '2026-10-20']);
        $this->mission($case, 'in_progress', ['due_date' => '2026-10-18']);
        $this->mission($case, 'abandoned');
        FocusSession::factory()->for($this->user)->for($done)->create(['completed' => true, 'duration_minutes' => 50]);
        FocusSession::factory()->for($this->user)->for($done)->create(['completed' => false, 'duration_minutes' => 10]);
        $case->milestones()->create(['name' => 'Second', 'target_date' => '2026-11-01']);
        $case->milestones()->create(['name' => 'First', 'target_date' => '2026-10-10']);

        $this->getJson("/api/v1/cases/{$case->id}")
            ->assertOk()
            ->assertJsonCount(4, 'data.missions')
            ->assertJsonPath('data.missions.0.due_date', '2026-10-18')
            ->assertJsonPath('data.missions.2.status', 'completed')
            ->assertJsonPath('data.missions.3.status', 'abandoned')
            ->assertJsonPath('data.milestones.0.name', 'First')
            ->assertJsonPath('data.milestones.0.is_overdue', true)
            ->assertJsonPath('data.analytics.total_focus_minutes', 50)
            ->assertJsonPath('data.analytics.missions_total', 3)
            ->assertJsonPath('data.analytics.missions_completed', 1)
            ->assertJsonPath('data.analytics.missions_remaining', 2)
            ->assertJsonPath('data.analytics.weeks_elapsed', 2)
            // One mission in two weeks: two more take four weeks.
            ->assertJsonPath('data.analytics.missions_per_week', 0.5)
            ->assertJsonPath('data.analytics.estimated_completion', '2026-11-14');

        $this->getJson("/api/v1/cases/{$case->id}/analytics")->assertOk()->assertJsonPath('data.missions_remaining', 2);
    }

    public function test_milestones_can_be_added_completed_and_removed(): void
    {
        $this->seed(AchievementsSeeder::class);
        $case = $this->case();

        $id = $this->postJson("/api/v1/cases/{$case->id}/milestones", ['name' => 'Find the informant', 'target_date' => '2026-10-24'])
            ->assertCreated()
            ->assertJsonPath('data.completed', false)
            ->json('data.id');
        $this->postJson("/api/v1/cases/{$case->id}/milestones", ['name' => 'No date'])->assertJsonValidationErrors(['target_date']);

        $this->putJson("/api/v1/cases/{$case->id}/milestones/{$id}", ['completed' => true])
            ->assertOk()
            ->assertJsonPath('message', 'Milestone reached, sir. One step closer.')
            ->assertJsonPath('data.completed', true);
        $this->assertNotNull($case->milestones()->sole()->completed_at);

        $this->putJson("/api/v1/cases/{$case->id}/milestones/{$id}", ['completed' => false])->assertJsonPath('data.completed_at', null);
        $this->getJson("/api/v1/cases/{$case->id}/milestones")->assertJsonCount(1, 'data');

        $this->deleteJson("/api/v1/cases/{$case->id}/milestones/{$id}")->assertOk();
        $this->assertSame(0, $case->milestones()->count());
    }

    public function test_other_users_cases_are_not_found_and_deleting_keeps_missions(): void
    {
        $theirs = CaseFile::factory()->create();
        $this->getJson("/api/v1/cases/{$theirs->id}")->assertNotFound();
        $this->postJson("/api/v1/cases/{$theirs->id}/milestones", ['name' => 'X', 'target_date' => '2026-10-20'])->assertNotFound();
        $this->postJson("/api/v1/cases/{$theirs->id}/complete")->assertNotFound();

        $case = $this->case();
        $mission = $this->mission($case);
        $this->deleteJson("/api/v1/cases/{$case->id}")->assertOk();

        $this->assertSoftDeleted($case);
        $this->getJson("/api/v1/missions/{$mission->id}")->assertOk()->assertJsonPath('data.case', null);
    }
}
