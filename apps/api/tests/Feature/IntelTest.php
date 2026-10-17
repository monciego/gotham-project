<?php

namespace Tests\Feature;

use App\Models\Arsenal;
use App\Models\ArsenalLog;
use App\Models\FocusSession;
use App\Models\Intel;
use App\Models\Mission;
use App\Models\User;
use App\Services\IntelSentiment;
use Database\Seeders\AchievementsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class IntelTest extends TestCase
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

    public function test_filing_intel_awards_xp_scores_sentiment_and_cleans_the_html(): void
    {
        $this->postJson('/api/v1/intel', $this->entry([
            'content' => '<h2 onclick="steal()">Good day</h2><p style="color:red">Felt <strong>productive</strong> and proud.</p><script>alert(1)</script><a href="javascript:x">link</a>',
            'gratitude' => '  Alfred  ',
            'wins' => '',
            'tags' => [' work ', 'work', 'training'],
        ]))
            ->assertCreated()
            ->assertJsonPath('message', "Intel filed, sir. Gotham's patterns are becoming clearer.")
            ->assertJsonPath('data.entry.content', '<h2>Good day</h2><p>Felt <strong>productive</strong> and proud.</p>link')
            ->assertJsonPath('data.entry.excerpt', 'Good day Felt productive and proud. link')
            ->assertJsonPath('data.entry.sentiment_label', 'positive')
            ->assertJsonPath('data.entry.gratitude', 'Alfred')
            ->assertJsonPath('data.entry.wins', null)
            ->assertJsonPath('data.entry.tags', ['work', 'training'])
            ->assertJsonPath('data.xp_awarded', 5);

        $this->assertSame(5, $this->user->refresh()->total_xp);
    }

    public function test_sentiment_counts_keywords_against_the_words(): void
    {
        $sentiment = app(IntelSentiment::class);

        $this->assertSame(['score' => 0.25, 'label' => 'positive'], $sentiment->analyze('A great and productive day at the office'));
        $this->assertSame('negative', $sentiment->analyze('I can’t focus. Stressed and anxious all day.')['label']);
        $this->assertSame('negative', $sentiment->analyze('Burned out again')['label']);
        // One hit in a long entry stays under the threshold.
        $this->assertSame('neutral', $sentiment->analyze('Great '.str_repeat('word ', 60))['label']);
        $this->assertSame('neutral', $sentiment->analyze('Greatly overstated, the cannot list')['label']);
        $this->assertSame(['score' => 0.0, 'label' => 'neutral'], $sentiment->analyze(''));

        $this->assertTrue($sentiment->soundsBurnedOut("I can't do this anymore"));
        $this->assertFalse($sentiment->soundsBurnedOut('I cannot wait for the weekend'));
    }

    public function test_entries_need_their_fields_and_one_per_day_up_to_today(): void
    {
        $this->postJson('/api/v1/intel', [])->assertJsonValidationErrors(['date', 'content', 'mood', 'energy_level', 'stress_level']);
        $this->postJson('/api/v1/intel', $this->entry(['energy_level' => 11, 'mood' => 'meh']))->assertJsonValidationErrors(['energy_level', 'mood']);
        $this->postJson('/api/v1/intel', $this->entry(['date' => '2026-10-18']))->assertJsonValidationErrors(['date']);
        $this->postJson('/api/v1/intel', $this->entry(['content' => '<p> </p><script>x</script>']))->assertJsonValidationErrors(['content']);

        $this->postJson('/api/v1/intel', $this->entry())->assertCreated();
        $this->postJson('/api/v1/intel', $this->entry())->assertJsonValidationErrors(['date']);

        // Another user's entry for the same day is no conflict.
        Intel::factory()->create(['date' => '2026-10-16']);
        $this->postJson('/api/v1/intel', $this->entry(['date' => '2026-10-16']))->assertCreated();
    }

    public function test_burnout_words_get_an_immediate_alfred_message_once(): void
    {
        $this->postJson('/api/v1/intel', $this->entry(['content' => '<p>Long day.</p>', 'struggles' => 'Completely overwhelmed by the board.']));
        $entry = $this->user->intel()->sole();
        $this->putJson("/api/v1/intel/{$entry->id}", ['content' => '<p>Exhausted.</p>'])->assertOk();

        $this->assertSame(1, $this->user->alfredMessages()->where('type', 'burnout_detected')->where('title', 'Alfred is concerned.')->count());
    }

    public function test_three_negative_entries_in_a_row_get_an_alfred_message(): void
    {
        Intel::factory()->for($this->user)->create(['date' => '2026-10-15', 'sentiment_label' => 'negative']);
        Intel::factory()->for($this->user)->create(['date' => '2026-10-16', 'sentiment_label' => 'negative']);

        $this->postJson('/api/v1/intel', $this->entry(['content' => '<p>Terrible, awful day.</p>']))
            ->assertJsonPath('data.entry.sentiment_label', 'negative');

        $this->assertDatabaseHas('alfred_messages', ['user_id' => $this->user->id, 'type' => 'burnout_detected', 'priority' => 'high']);
    }

    public function test_a_better_entry_among_the_last_three_breaks_the_stretch(): void
    {
        Intel::factory()->for($this->user)->create(['date' => '2026-10-14', 'sentiment_label' => 'negative']);
        Intel::factory()->for($this->user)->create(['date' => '2026-10-15', 'sentiment_label' => 'positive']);
        Intel::factory()->for($this->user)->create(['date' => '2026-10-16', 'sentiment_label' => 'negative']);

        $this->postJson('/api/v1/intel', $this->entry(['content' => '<p>Terrible, awful day.</p>']));

        $this->assertDatabaseMissing('alfred_messages', ['type' => 'burnout_detected']);
    }

    public function test_index_filters_by_dates_mood_tag_and_search(): void
    {
        Intel::factory()->for($this->user)->create(['date' => '2026-10-16', 'mood' => 'great', 'tags' => ['work'], 'content' => '<p>Closed the merger</p>']);
        Intel::factory()->for($this->user)->create(['date' => '2026-10-10', 'mood' => 'bad', 'tags' => ['family'], 'content' => '<p>Long night</p>']);
        Intel::factory()->for($this->user)->create(['date' => '2026-09-30', 'mood' => 'great', 'tags' => [], 'content' => '<p>Quiet</p>']);
        Intel::factory()->create(['date' => '2026-10-16']);

        $this->getJson('/api/v1/intel')->assertJsonCount(3, 'data.items')->assertJsonPath('data.items.0.date', '2026-10-16')->assertJsonPath('data.meta.total', 3);
        $this->getJson('/api/v1/intel?from=2026-10-01&to=2026-10-31')->assertJsonCount(2, 'data.items');
        $this->getJson('/api/v1/intel?mood=great')->assertJsonCount(2, 'data.items');
        $this->getJson('/api/v1/intel?tag=family')->assertJsonCount(1, 'data.items')->assertJsonPath('data.items.0.mood', 'bad');
        $this->getJson('/api/v1/intel?search=merger')->assertJsonCount(1, 'data.items');
        $this->getJson('/api/v1/intel?search=famil')->assertJsonCount(1, 'data.items');
    }

    public function test_show_links_to_the_entries_around_it(): void
    {
        $first = Intel::factory()->for($this->user)->create(['date' => '2026-10-01']);
        $middle = Intel::factory()->for($this->user)->create(['date' => '2026-10-05']);
        $last = Intel::factory()->for($this->user)->create(['date' => '2026-10-09']);

        $this->getJson("/api/v1/intel/{$middle->id}")
            ->assertOk()
            ->assertJsonPath('data.previous_id', $first->id)
            ->assertJsonPath('data.next_id', $last->id);
        $this->getJson("/api/v1/intel/{$first->id}")->assertJsonPath('data.previous_id', null);
    }

    public function test_editing_rescores_and_deleting_takes_back_the_xp(): void
    {
        $id = $this->postJson('/api/v1/intel', $this->entry(['content' => '<p>Wonderful, fantastic day</p>']))->json('data.entry.id');

        $this->putJson("/api/v1/intel/{$id}", ['content' => '<p>Actually a horrible, awful day</p>', 'mood' => 'bad'])
            ->assertOk()
            ->assertJsonPath('data.sentiment_label', 'negative')
            ->assertJsonPath('data.mood', 'bad')
            ->assertJsonPath('data.energy_level', 6);

        $this->deleteJson("/api/v1/intel/{$id}")->assertOk();
        $this->assertSame(0, $this->user->refresh()->total_xp);
        $this->assertSame(0, Intel::count());
    }

    public function test_other_users_entries_are_not_found(): void
    {
        $theirs = Intel::factory()->create();

        $this->getJson("/api/v1/intel/{$theirs->id}")->assertNotFound();
        $this->putJson("/api/v1/intel/{$theirs->id}", ['mood' => 'great'])->assertNotFound();
        $this->deleteJson("/api/v1/intel/{$theirs->id}")->assertNotFound();
    }

    public function test_the_prompt_reflects_the_day(): void
    {
        $this->assertPrompt('quiet_day');

        FocusSession::factory()->for($this->user)->count(2)->create(['start_time' => '2026-10-17 00:10:00']);
        $this->assertPrompt('deep_work');

        Mission::factory()->for($this->user)->count(3)->create(['status' => 'completed', 'completed_at' => '2026-10-17 00:30:00']);
        $this->assertPrompt('productive_day');

        Intel::factory()->for($this->user)->create(['date' => '2026-10-16', 'energy_level' => 2]);
        $this->assertPrompt('low_energy');

        $habit = Arsenal::factory()->for($this->user)->create(['name' => 'Morning run', 'created_at' => '2026-10-01 00:00:00']);
        foreach (['2026-10-13', '2026-10-14', '2026-10-15'] as $date) {
            ArsenalLog::create(['arsenal_id' => $habit->id, 'user_id' => $this->user->id, 'date' => $date, 'completed' => true]);
        }
        $this->getJson('/api/v1/intel/prompt')
            ->assertJsonPath('data.reason', 'broken_streak')
            ->assertJsonPath('data.prompt', 'Your Morning run streak ended yesterday. What got in the way, and what would make it easier to start again?');
    }

    public function test_insights_summarise_the_journal(): void
    {
        foreach (['2026-10-17' => 'great', '2026-10-16' => 'good', '2026-10-15' => 'okay', '2026-10-13' => 'bad'] as $date => $mood) {
            Intel::factory()->for($this->user)->create(['date' => $date, 'mood' => $mood, 'energy_level' => 6, 'tags' => ['work']]);
        }
        Intel::factory()->for($this->user)->create(['date' => '2026-09-20', 'mood' => 'terrible', 'energy_level' => 1, 'tags' => ['family', 'work']]);

        $this->getJson('/api/v1/intel/insights')
            ->assertOk()
            ->assertJsonPath('data.entries_this_month', 4)
            ->assertJsonPath('data.streak', 3)
            ->assertJsonPath('data.mood_average', ['score' => 3.5, 'mood' => 'good'])
            ->assertJsonPath('data.mood_trend.6', ['date' => '2026-10-17', 'mood' => 'great'])
            ->assertJsonPath('data.mood_trend.3', ['date' => '2026-10-14', 'mood' => null])
            ->assertJsonPath('data.average_energy', 6)
            ->assertJsonPath('data.top_tags', [['tag' => 'work', 'count' => 5], ['tag' => 'family', 'count' => 1]]);
    }

    public function test_journal_trophies_are_awarded(): void
    {
        $this->seed(AchievementsSeeder::class);
        foreach (range(11, 16) as $day) {
            Intel::factory()->for($this->user)->create(['date' => "2026-10-{$day}"]);
        }

        $keys = collect($this->postJson('/api/v1/intel', $this->entry())->json('data.achievements'))->pluck('key');

        $this->assertContains('first_intel', $keys);
        $this->assertContains('intel_streak_7', $keys);
    }

    /** @return array<string, mixed> */
    private function entry(array $overrides = []): array
    {
        return [
            'date' => '2026-10-17',
            'content' => '<p>Board meeting went fine.</p>',
            'mood' => 'good',
            'energy_level' => 6,
            'stress_level' => 4,
            ...$overrides,
        ];
    }

    private function assertPrompt(string $reason): void
    {
        $this->getJson('/api/v1/intel/prompt')->assertOk()->assertJsonPath('data.reason', $reason);
    }
}
