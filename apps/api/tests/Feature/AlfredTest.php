<?php

namespace Tests\Feature;

use App\Jobs\AlfredRoundsJob;
use App\Models\AlfredMessage;
use App\Models\Arsenal;
use App\Models\ArsenalLog;
use App\Models\FocusSession;
use App\Models\Mission;
use App\Models\User;
use App\Services\AlfredIntelligence;
use App\Services\AlfredService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AlfredTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        // 09:00 in Manila on Saturday, Oct 17.
        $this->travelTo('2026-10-17 01:00:00');
        $this->user = User::factory()->create(['timezone' => 'Asia/Manila', 'current_mode' => 'bruce']);
        $this->actingAs($this->user, 'sanctum');
    }

    private function alfred(): AlfredService
    {
        return app(AlfredService::class);
    }

    private function intelligence(): AlfredIntelligence
    {
        return app(AlfredIntelligence::class);
    }

    /** A daily habit done every day for the last `$days` days, not yet today. */
    private function habitOnAStreak(int $days): Arsenal
    {
        $habit = Arsenal::factory()->for($this->user)->create(['created_at' => CarbonImmutable::parse('2026-10-17', 'Asia/Manila')->subDays($days)->utc()]);
        foreach (range(1, $days) as $daysAgo) {
            ArsenalLog::create([
                'arsenal_id' => $habit->id,
                'user_id' => $this->user->id,
                'date' => CarbonImmutable::parse('2026-10-17')->subDays($daysAgo)->toDateString(),
                'completed' => true,
            ]);
        }

        return $habit;
    }

    public function test_messages_come_from_their_templates(): void
    {
        $mission = Mission::factory()->for($this->user)->create(['title' => 'File the taxes']);
        $message = $this->alfred()->sendMessage($this->user, 'task_avoidance', ['title' => 'File the taxes', 'count' => 4, 'mission_id' => $mission->id]);

        $this->assertSame('critical', $message->priority);
        $this->assertSame('⚠️ PATTERN DETECTED', $message->title);
        $this->assertSame("You've postponed 'File the taxes' 4 times, sir. Either do it now or let it go. Gotham cannot wait indefinitely.", $message->message);
        $this->assertSame(['label' => 'Start 25-min session', 'action' => "force_start:{$mission->id}", 'variant' => 'primary'], $message->actions[0]);
        $this->assertSame($mission->id, $message->subject_id);
        $this->assertTrue($message->requires_action);
        $this->assertNull($message->read_at);

        // Receipts of what the user just saw go straight into the history.
        $this->assertNotNull($this->alfred()->sendMessage($this->user, 'case_closed', ['name' => 'Falcone', 'case_id' => 1])->read_at);

        $this->expectException(\InvalidArgumentException::class);
        $this->alfred()->sendMessage($this->user, 'nonsense');
    }

    public function test_index_puts_unread_and_critical_first_and_counts_unread(): void
    {
        AlfredMessage::factory()->for($this->user)->create(['title' => 'Old news', 'read_at' => now()]);
        AlfredMessage::factory()->for($this->user)->create(['title' => 'Low', 'priority' => 'low']);
        AlfredMessage::factory()->for($this->user)->create(['title' => 'Critical', 'priority' => 'critical']);
        AlfredMessage::factory()->for($this->user)->create(['title' => 'Put away', 'dismissed_at' => now()]);
        AlfredMessage::factory()->create(['title' => 'Someone else']);

        $this->getJson('/api/v1/alfred/messages')
            ->assertOk()
            ->assertJsonPath('data.unread_count', 2)
            ->assertJsonCount(3, 'data.messages')
            ->assertJsonPath('data.messages.0.title', 'Critical')
            ->assertJsonPath('data.messages.1.title', 'Low')
            ->assertJsonPath('data.messages.2.title', 'Old news');

        $this->getJson('/api/v1/alfred/messages?scope=all')->assertJsonCount(4, 'data.messages');
    }

    public function test_reading_dismissing_and_reading_everything(): void
    {
        [$first, $second, $third] = AlfredMessage::factory()->for($this->user)->count(3)->create();

        $this->patchJson("/api/v1/alfred/messages/{$first->id}/read")->assertOk();
        $this->assertNotNull($first->refresh()->read_at);
        $this->assertNull($first->dismissed_at);

        $this->patchJson("/api/v1/alfred/messages/{$second->id}/dismiss")->assertOk();
        $this->assertNotNull($second->refresh()->dismissed_at);
        $this->assertNotNull($second->read_at);

        $this->patchJson('/api/v1/alfred/messages/read-all')->assertOk()->assertJsonPath('data.marked', 1);
        $this->assertNotNull($third->refresh()->read_at);

        $theirs = AlfredMessage::factory()->create();
        $this->patchJson("/api/v1/alfred/messages/{$theirs->id}/read")->assertNotFound();
    }

    public function test_only_the_messages_own_actions_run(): void
    {
        $message = $this->alfred()->sendMessage($this->user, 'burnout_detected');

        $this->postJson("/api/v1/alfred/messages/{$message->id}/action", ['action' => 'switch_mode:batman'])->assertJsonValidationErrors(['action']);
        $this->postJson("/api/v1/alfred/messages/{$message->id}/action", ['action' => 'link'])->assertJsonValidationErrors(['action']);
        $this->assertSame('bruce', $this->user->refresh()->current_mode);

        $this->postJson("/api/v1/alfred/messages/{$message->id}/action", ['action' => 'switch_mode:rest'])
            ->assertOk()
            ->assertJsonPath('data.result.type', 'toast')
            ->assertJsonPath('data.result.title', 'Rest mode, sir.')
            ->assertJsonPath('data.message.read_at', fn ($value) => $value !== null);

        $this->assertSame('rest', $this->user->refresh()->current_mode);
        $message->refresh();
        $this->assertTrue($message->action_taken);
        $this->assertNotNull($message->acted_at);
        $this->assertNotNull($message->dismissed_at);
    }

    public function test_force_start_opens_a_session_and_abandon_lets_the_mission_go(): void
    {
        $mission = Mission::factory()->for($this->user)->create(['status' => 'not_started', 'times_postponed' => 3]);
        $first = $this->alfred()->sendMessage($this->user, 'task_avoidance', ['title' => $mission->title, 'count' => 3, 'mission_id' => $mission->id]);

        $response = $this->postJson("/api/v1/alfred/messages/{$first->id}/action", ['action' => "force_start:{$mission->id}"])
            ->assertOk()
            ->assertJsonPath('data.result.type', 'redirect');
        $session = $mission->focusSessions()->sole();
        $response->assertJsonPath('data.result.to', "/focus/{$session->id}");
        $this->assertSame(25, $session->duration_minutes);
        $this->assertSame('in_progress', $mission->refresh()->status);

        $second = $this->alfred()->sendMessage($this->user, 'task_avoidance', ['title' => $mission->title, 'count' => 3, 'mission_id' => $mission->id]);
        $this->postJson("/api/v1/alfred/messages/{$second->id}/action", ['action' => "abandon:{$mission->id}"])
            ->assertOk()
            ->assertJsonPath('data.result.title', 'Understood, sir.');

        $this->assertSame('abandoned', $mission->refresh()->status);
        $this->assertNotNull($session->refresh()->end_time);
    }

    public function test_protecting_a_streak_completes_the_habit_with_its_rewards(): void
    {
        $habit = $this->habitOnAStreak(5);
        $message = $this->alfred()->sendMessage($this->user, 'streak_danger', ['count' => 5, 'habit_id' => $habit->id]);

        $this->user->update(['current_mode' => 'batman']);
        $this->postJson("/api/v1/alfred/messages/{$message->id}/action", ['action' => "complete_habit:{$habit->id}"])
            ->assertOk()
            ->assertJsonPath('data.result.title', 'Streak protected, sir.')
            ->assertJsonPath('rewards.xp.0.reason', 'habit_complete');

        $this->assertSame(6, $habit->refresh()->current_streak);
    }

    public function test_help_and_start_point_at_the_most_urgent_mission(): void
    {
        Mission::factory()->for($this->user)->create(['status' => 'not_started', 'due_date' => '2026-10-20', 'title' => 'Later']);
        $urgent = Mission::factory()->for($this->user)->create(['status' => 'not_started', 'due_date' => '2026-10-15', 'title' => 'Overdue']);
        $message = $this->alfred()->sendMessage($this->user, 'no_start', ['time' => '10:00 AM']);

        $this->postJson("/api/v1/alfred/messages/{$message->id}/action", ['action' => 'show_help'])
            ->assertJsonPath('data.result', ['type' => 'help', 'mission' => ['id' => $urgent->id, 'title' => 'Overdue']]);
        // Asking for help leaves the message up: read, but not handled.
        $message->refresh();
        $this->assertNull($message->dismissed_at);
        $this->assertFalse($message->action_taken);
        $this->assertNotNull($message->read_at);

        $this->postJson("/api/v1/alfred/messages/{$message->id}/action", ['action' => 'start_mission'])
            ->assertJsonPath('data.result', ['type' => 'redirect', 'to' => "/missions/{$urgent->id}"]);
    }

    public function test_no_start_after_ten_once_a_day_and_never_in_rest_mode(): void
    {
        $this->intelligence()->detectProcrastination($this->user);
        $this->assertSame(0, $this->user->alfredMessages()->count());

        // 10:30 in Manila.
        $this->travelTo('2026-10-17 02:30:00');
        $this->intelligence()->detectProcrastination($this->user);
        $this->intelligence()->detectProcrastination($this->user);

        $message = $this->user->alfredMessages()->sole();
        $this->assertSame('no_start', $message->type);
        $this->assertSame("It's 10:30 AM and you haven't started anything today. What's blocking you, sir?", $message->message);

        // The next day, a session already started.
        $this->travelTo('2026-10-18 03:00:00');
        FocusSession::factory()->for($this->user)->create(['start_time' => '2026-10-18 01:00:00']);
        $this->intelligence()->detectProcrastination($this->user);

        // The day after, resting.
        $this->travelTo('2026-10-19 03:00:00');
        $this->user->update(['current_mode' => 'rest']);
        $this->intelligence()->detectProcrastination($this->user);

        $this->assertSame(1, $this->user->alfredMessages()->where('type', 'no_start')->count());
    }

    public function test_avoided_missions_once_a_day_unless_the_last_warning_is_unread(): void
    {
        FocusSession::factory()->for($this->user)->create(['start_time' => now()]);
        $avoided = Mission::factory()->for($this->user)->create(['status' => 'not_started', 'times_postponed' => 3]);
        Mission::factory()->for($this->user)->create(['status' => 'not_started', 'times_postponed' => 2]);
        Mission::factory()->for($this->user)->create(['status' => 'completed', 'times_postponed' => 5]);

        $this->intelligence()->detectProcrastination($this->user);
        $this->intelligence()->detectProcrastination($this->user);
        $this->assertSame([$avoided->id], $this->user->alfredMessages()->where('type', 'task_avoidance')->pluck('subject_id')->all());

        // Tomorrow, but yesterday's warning is still unread.
        $this->travel(1)->day();
        $this->intelligence()->detectProcrastination($this->user);
        $this->assertSame(1, $this->user->alfredMessages()->where('type', 'task_avoidance')->count());

        $this->user->alfredMessages()->update(['read_at' => now()]);
        $this->intelligence()->detectProcrastination($this->user);
        $this->assertSame(2, $this->user->alfredMessages()->where('type', 'task_avoidance')->count());
    }

    public function test_streak_danger_for_unchecked_streaks_over_three(): void
    {
        // Bruce mode forgives a miss, so today alone wouldn't break anything there.
        $this->user->update(['current_mode' => 'batman']);
        $atRisk = $this->habitOnAStreak(5);
        $this->habitOnAStreak(2);
        $done = $this->habitOnAStreak(6);
        ArsenalLog::create(['arsenal_id' => $done->id, 'user_id' => $this->user->id, 'date' => '2026-10-17', 'completed' => true]);

        $this->intelligence()->detectStreakDanger($this->user);
        $this->intelligence()->detectStreakDanger($this->user);

        $message = $this->user->alfredMessages()->sole();
        $this->assertSame($atRisk->id, $message->subject_id);
        $this->assertSame('5 days of showing up. 5 days of proof you can do this. Gone if you skip now. Is it worth it, sir?', $message->message);
    }

    public function test_the_rounds_follow_each_users_clock(): void
    {
        $this->user->update(['current_mode' => 'batman']);
        $this->habitOnAStreak(5);
        FocusSession::factory()->for($this->user)->create(['start_time' => now()]);

        // 19:00 in Manila: nothing yet.
        $this->travelTo('2026-10-17 11:00:00');
        (new AlfredRoundsJob)->handle($this->intelligence());
        $this->assertFalse($this->user->alfredMessages()->where('type', 'streak_danger')->exists());

        // 20:00 in Manila.
        $this->travelTo('2026-10-17 12:00:00');
        (new AlfredRoundsJob)->handle($this->intelligence());
        $this->assertTrue($this->user->alfredMessages()->where('type', 'streak_danger')->exists());
    }
}
