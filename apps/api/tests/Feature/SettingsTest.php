<?php

namespace Tests\Feature;

use App\Jobs\AlfredRoundsJob;
use App\Models\Arsenal;
use App\Models\CaseFile;
use App\Models\Intel;
use App\Models\Mission;
use App\Models\User;
use App\Services\AlfredIntelligence;
use App\Services\AlfredService;
use Database\Seeders\AchievementsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use ZipArchive;

class SettingsTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        // 11:00 in Manila on Saturday, Oct 17.
        $this->travelTo('2026-10-17 03:00:00');
        $this->user = User::factory()->create(['timezone' => 'Asia/Manila']);
        $this->actingAs($this->user, 'sanctum');
    }

    public function test_settings_have_defaults_and_save_any_subset(): void
    {
        $this->getJson('/api/v1/settings')
            ->assertOk()
            ->assertJsonPath('data.current_mode', 'bruce')
            ->assertJsonPath('data.notification_preferences.morning_brief', true)
            ->assertJsonPath('data.notification_preferences.quiet_hours_start', null)
            ->assertJsonPath('data.alfred_aggressiveness', 'normal')
            ->assertJsonPath('data.theme', 'dark');

        $this->putJson('/api/v1/settings', [
            'notification_preferences' => ['streak_warnings' => false, 'quiet_hours_start' => '22:00', 'quiet_hours_end' => '07:00'],
            'work_start_time' => '08:30',
            'work_end_time' => '17:30',
            'alfred_aggressiveness' => 'intense',
            'theme' => 'light',
        ])
            ->assertOk()
            ->assertJsonPath('data.notification_preferences.streak_warnings', false)
            // Switches not sent keep their value.
            ->assertJsonPath('data.notification_preferences.alfred_alerts', true)
            ->assertJsonPath('data.notification_preferences.quiet_hours_end', '07:00')
            ->assertJsonPath('data.work_start_time', '08:30')
            ->assertJsonPath('data.alfred_aggressiveness', 'intense')
            ->assertJsonPath('data.theme', 'light');

        $this->putJson('/api/v1/settings', ['notification_preferences' => ['morning_brief' => false]])
            ->assertJsonPath('data.notification_preferences.streak_warnings', false)
            ->assertJsonPath('data.notification_preferences.morning_brief', false);

        $this->getJson('/api/v1/auth/me')->assertJsonPath('data.theme', 'light')->assertJsonPath('data.work_end_time', '17:30');
    }

    public function test_settings_are_validated(): void
    {
        $this->putJson('/api/v1/settings', [
            'notification_preferences' => ['morning_brief' => 'maybe', 'quiet_hours_start' => '22:00', 'sms' => true],
            'work_start_time' => '9am',
            'alfred_aggressiveness' => 'brutal',
            'theme' => 'neon',
        ])->assertUnprocessable()->assertJsonValidationErrors([
            'notification_preferences',
            'notification_preferences.morning_brief',
            'notification_preferences.quiet_hours_end',
            'work_start_time',
            'alfred_aggressiveness',
            'theme',
        ]);

        $this->putJson('/api/v1/settings', ['work_start_time' => '09:00', 'work_end_time' => '09:00'])
            ->assertJsonValidationErrors(['work_end_time' => 'The day must end some time after it starts, sir.']);
    }

    public function test_switching_mode_is_logged_and_announced(): void
    {
        $this->putJson('/api/v1/settings/mode', ['mode' => 'batman'])
            ->assertOk()
            ->assertJsonPath('data.user.current_mode', 'batman');

        $this->putJson('/api/v1/settings/mode', ['mode' => 'rest'])
            ->assertJsonPath('message', "Rest is productive too, sir. I'll be here when you're ready.")
            ->assertJsonPath('data.announcement.title', 'Rest mode, sir.');

        // The same mode again changes nothing and logs nothing.
        $this->putJson('/api/v1/settings/mode', ['mode' => 'rest'])->assertOk();
        $this->putJson('/api/v1/settings/mode', ['mode' => 'joker'])->assertJsonValidationErrors('mode');

        $history = $this->user->systemIntelligence()->where('pattern_type', 'mode_history')->sole();
        $this->assertSame(
            [['bruce', 'batman', 'settings'], ['batman', 'rest', 'settings']],
            collect($history->pattern_data['changes'])->map(fn (array $change) => [$change['from'], $change['to'], $change['source']])->all(),
        );

        // HQ follows the mode: no mission pushed in Rest mode.
        Mission::factory()->for($this->user)->create(['status' => 'not_started', 'due_date' => '2026-10-17']);
        $this->getJson('/api/v1/dashboard')
            ->assertJsonPath('data.morning_brief.mode', 'rest')
            ->assertJsonPath('data.morning_brief.mode_line', 'Rest mode. Nothing on the list demands you today, sir. Recover.')
            ->assertJsonPath('data.morning_brief.mission', null);
    }

    public function test_export_zips_every_feature_as_json(): void
    {
        Mission::factory()->for($this->user)->create(['title' => 'Find the mole']);
        Arsenal::factory()->for($this->user)->create(['name' => 'Run'])->delete();
        Mission::factory()->for(User::factory())->create(['title' => 'Someone else']);

        $response = $this->get('/api/v1/settings/export')->assertOk();
        $this->assertStringContainsString('gotham-export-2026-10-17.zip', $response->headers->get('Content-Disposition'));

        $zip = new ZipArchive;
        $this->assertTrue($zip->open($response->getFile()->getPathname()));
        $this->assertNotFalse($zip->locateName('profile.json'));
        $this->assertNotFalse($zip->locateName('alfred_messages.json'));

        $missions = json_decode($zip->getFromName('missions.json'), true);
        $this->assertSame(['Find the mole'], array_column($missions, 'title'));
        // Deleted habits are part of the user's data too.
        $habits = json_decode($zip->getFromName('arsenal.json'), true);
        $this->assertSame('Run', $habits[0]['name']);
        $this->assertNotNull($habits[0]['deleted_at']);
        $this->assertSame($this->user->email, json_decode($zip->getFromName('profile.json'), true)['email']);
        $zip->close();
    }

    public function test_completing_onboarding_earns_its_trophy_once(): void
    {
        $this->seed(AchievementsSeeder::class);

        $this->postJson('/api/v1/onboarding/complete')
            ->assertOk()
            ->assertJsonPath('data.onboarding_completed', true)
            ->assertJsonPath('rewards.trophies.0.key', 'onboarding');

        $this->postJson('/api/v1/onboarding/complete')->assertOk()->assertJsonMissingPath('rewards.trophies');
    }

    public function test_switched_off_messages_are_not_sent(): void
    {
        $this->user->update(['notification_preferences' => ['streak_warnings' => false]]);

        $this->assertNull(app(AlfredService::class)->sendMessage($this->user, 'streak_danger', ['count' => 5, 'habit_id' => 1]));
        // Receipts and other kinds still arrive.
        $this->assertNotNull(app(AlfredService::class)->sendMessage($this->user, 'case_closed', ['name' => 'Falcone', 'case_id' => 1]));
        $this->assertDatabaseMissing('alfred_messages', ['type' => 'streak_danger']);
    }

    public function test_aggressiveness_sets_when_alfred_steps_in(): void
    {
        // 11:00 local: past the normal 10am, before mild's noon.
        $this->user->update(['alfred_aggressiveness' => 'mild']);
        Mission::factory()->for($this->user)->create(['status' => 'not_started', 'times_postponed' => 3]);
        (new AlfredRoundsJob)->handle(app(AlfredIntelligence::class));
        $this->assertSame(0, $this->user->alfredMessages()->count());

        $this->user->update(['alfred_aggressiveness' => 'intense']);
        $mission = Mission::factory()->for($this->user)->create(['status' => 'not_started', 'due_date' => '2026-10-20', 'times_postponed' => 1]);
        $this->putJson("/api/v1/missions/{$mission->id}", ['due_date' => '2026-10-22'])->assertOk();
        $this->assertDatabaseHas('alfred_messages', ['type' => 'task_avoidance', 'subject_id' => $mission->id]);

        (new AlfredRoundsJob)->handle(app(AlfredIntelligence::class));
        $this->assertDatabaseHas('alfred_messages', ['type' => 'no_start']);
    }

    public function test_quiet_hours_silence_the_rounds(): void
    {
        // 11:00 local falls inside 10:00–12:00.
        $this->user->update(['notification_preferences' => ['quiet_hours_start' => '10:00', 'quiet_hours_end' => '12:00']]);
        (new AlfredRoundsJob)->handle(app(AlfredIntelligence::class));
        $this->assertSame(0, $this->user->alfredMessages()->count());

        // Spanning midnight: 22:00–07:00 doesn't cover 11:00.
        $this->user->update(['notification_preferences' => ['quiet_hours_start' => '22:00', 'quiet_hours_end' => '07:00']]);
        $this->assertFalse($this->user->inQuietHours());
        $this->assertTrue($this->user->inQuietHours(now()->setTimezone('Asia/Manila')->setTime(23, 30)));
        $this->assertTrue($this->user->inQuietHours(now()->setTimezone('Asia/Manila')->setTime(6, 59)));

        (new AlfredRoundsJob)->handle(app(AlfredIntelligence::class));
        $this->assertDatabaseHas('alfred_messages', ['type' => 'no_start']);
    }

    public function test_search_groups_results_by_feature(): void
    {
        foreach (range(1, 7) as $index) {
            Mission::factory()->for($this->user)->create(['title' => "Joker lead {$index}", 'due_date' => "2026-10-2{$index}"]);
        }
        Mission::factory()->for($this->user)->create(['title' => 'Quiet night', 'description' => 'Nothing from the JOKER tonight.', 'due_date' => '2026-10-18']);
        Mission::factory()->for(User::factory())->create(['title' => 'Not my Joker']);
        Arsenal::factory()->for($this->user)->create(['name' => 'Read', 'description' => 'Joker case files, 30 minutes']);
        Intel::factory()->for($this->user)->create(['date' => '2026-10-16', 'content' => '<p>The <strong>Joker</strong> escaped again.</p>', 'tags' => ['arkham']]);
        Intel::factory()->for($this->user)->create(['date' => '2026-10-15', 'content' => '<p>A <strong>calm</strong> day.</p>', 'tags' => ['joker-free']]);
        // Matches only inside the markup, so it isn't a result.
        Intel::factory()->for($this->user)->create(['date' => '2026-10-14', 'content' => '<p>Nothing <strong>at all</strong>.</p>', 'tags' => []]);
        CaseFile::factory()->for($this->user)->create(['name' => 'The Joker files', 'description' => null, 'status' => 'active']);
        $this->user->operations()->create(['title' => 'Joker briefing', 'start_time' => '2026-10-18 02:00:00', 'end_time' => '2026-10-18 03:00:00', 'category' => 'work']);

        $response = $this->getJson('/api/v1/search?q=joker')->assertOk();

        $missions = $response->json('data.results.missions');
        $this->assertCount(5, $missions);
        // Title matches first, so the description match is left out.
        $this->assertNotContains('Quiet night', array_column($missions, 'title'));
        $this->assertSame(['id' => $missions[0]['id'], 'type' => 'mission', 'title' => 'Joker lead 1', 'route' => "/missions/{$missions[0]['id']}"], array_intersect_key($missions[0], array_flip(['id', 'type', 'title', 'route'])));

        $response
            ->assertJsonPath('data.results.arsenal.0.snippet', 'Joker case files, 30 minutes')
            ->assertJsonPath('data.results.intel.0.title', 'Friday, October 16, 2026')
            ->assertJsonPath('data.results.intel.0.snippet', 'The Joker escaped again.')
            ->assertJsonPath('data.results.intel.1.snippet', 'A calm day.')
            ->assertJsonPath('data.results.cases.0.title', 'The Joker files')
            // 10:00 on the 18th in Manila.
            ->assertJsonPath('data.results.operations.0.route', '/operations?date=2026-10-18')
            ->assertJsonPath('data.total', 10);
        $this->assertCount(2, $response->json('data.results.intel'));

        $this->getJson('/api/v1/search?q=strong')->assertJsonPath('data.total', 0);
        $this->getJson('/api/v1/search?q=j')->assertJsonValidationErrors('q');
    }

    public function test_long_text_snippets_centre_on_the_match(): void
    {
        $text = str_repeat('Gotham sleeps. ', 10).'The Riddler left a clue at the docks. '.str_repeat('Rain again. ', 10);
        Mission::factory()->for($this->user)->create(['title' => 'Patrol', 'description' => $text]);

        $snippet = $this->getJson('/api/v1/search?q=riddler')->json('data.results.missions.0.snippet');

        $this->assertStringStartsWith('…', $snippet);
        $this->assertStringEndsWith('…', $snippet);
        $this->assertStringContainsString('The Riddler left a clue', $snippet);
    }
}
