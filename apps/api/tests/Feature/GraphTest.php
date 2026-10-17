<?php

namespace Tests\Feature;

use App\Models\Arsenal;
use App\Models\ArsenalLog;
use App\Models\CaseFile;
use App\Models\FocusSession;
use App\Models\Intel;
use App\Models\Mission;
use App\Models\User;
use Database\Seeders\GraphDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GraphTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->travelTo('2026-10-17 12:00:00');
        $this->user = User::factory()->create(['timezone' => 'UTC', 'current_mode' => 'bruce']);
        $this->actingAs($this->user, 'sanctum');
    }

    /** @return array<string, array<string, mixed>> */
    private function nodes(array $query = []): array
    {
        return collect($this->getJson('/api/v1/graph?'.http_build_query($query))->assertOk()->json('data.nodes'))->keyBy('id')->all();
    }

    public function test_nodes_and_edges_connect_the_users_life(): void
    {
        $case = CaseFile::factory()->for($this->user)->create(['name' => 'Website Launch', 'color' => null, 'status' => 'active', 'progress' => 45]);
        $hosting = Mission::factory()->for($this->user)->create(['title' => 'Set up hosting', 'priority' => 'high', 'status' => 'in_progress', 'case_id' => $case->id]);
        $domain = Mission::factory()->for($this->user)->create(['title' => 'Configure domain', 'priority' => 'critical', 'status' => 'not_started', 'case_id' => $case->id, 'times_postponed' => 4]);
        $domain->dependencies()->attach($hosting->id);
        FocusSession::factory()->for($this->user)->create(['mission_id' => $hosting->id, 'duration_minutes' => 50, 'completed' => true]);
        FocusSession::factory()->for($this->user)->create(['mission_id' => $hosting->id, 'duration_minutes' => 25, 'completed' => false]);

        $habit = Arsenal::factory()->for($this->user)->create(['name' => 'Run', 'created_at' => '2026-10-01']);
        $entry = Intel::factory()->for($this->user)->create(['date' => '2026-10-15', 'mood' => 'great']);
        Intel::factory()->for($this->user)->create(['date' => '2026-10-14', 'mood' => 'bad']);
        foreach (['2026-10-15', '2026-10-16'] as $date) {
            ArsenalLog::create(['arsenal_id' => $habit->id, 'user_id' => $this->user->id, 'date' => $date, 'completed' => true]);
        }
        // Someone else's mission never appears.
        Mission::factory()->for(User::factory())->create();

        $response = $this->getJson('/api/v1/graph')->assertOk();
        $nodes = collect($response->json('data.nodes'))->keyBy('id');

        $this->assertSame(['case', 'mission', 'mission', 'arsenal', 'intel', 'intel'], $nodes->pluck('type')->all());
        $this->assertSame(['progress' => 45, 'color' => '#D4AF37', 'size' => 32], array_intersect_key($nodes["case-{$case->id}"], array_flip(['color', 'size', 'progress'])));
        $this->assertSame('#DC2626', $nodes["mission-{$domain->id}"]['color']);
        $this->assertSame(4, $nodes["mission-{$domain->id}"]['times_postponed']);
        // Only completed sessions count as focus.
        $this->assertSame(50, $nodes["mission-{$hosting->id}"]['focus_minutes']);
        $this->assertSame('#10B981', $nodes["intel-{$entry->id}"]['color']);
        $this->assertSame('Oct 15', $nodes["intel-{$entry->id}"]['label']);

        $edges = collect($response->json('data.edges'))->map(fn (array $edge) => [$edge['type'], $edge['source'], $edge['target']])->all();
        $this->assertEqualsCanonicalizing([
            ['belongs_to', "mission-{$hosting->id}", "case-{$case->id}"],
            ['belongs_to', "mission-{$domain->id}", "case-{$case->id}"],
            ['depends_on', "mission-{$domain->id}", "mission-{$hosting->id}"],
            // Only the day with both a check-in and an entry.
            ['correlated', "arsenal-{$habit->id}", "intel-{$entry->id}"],
        ], $edges);
    }

    public function test_filters(): void
    {
        $done = Mission::factory()->for($this->user)->create(['status' => 'completed', 'priority' => 'low']);
        $open = Mission::factory()->for($this->user)->create(['status' => 'not_started']);
        $old = Intel::factory()->for($this->user)->create(['date' => '2026-09-01']);
        $recent = Intel::factory()->for($this->user)->create(['date' => '2026-10-10']);

        $nodes = $this->nodes();
        $this->assertArrayHasKey("mission-{$open->id}", $nodes);
        $this->assertArrayNotHasKey("mission-{$done->id}", $nodes);
        $this->assertArrayHasKey("intel-{$recent->id}", $nodes);
        $this->assertArrayNotHasKey("intel-{$old->id}", $nodes);

        $nodes = $this->nodes(['show_completed' => 1, 'days' => 60]);
        // Completed missions recede: muted and smaller.
        $this->assertSame(['color' => '#4B5563', 'size' => 14], array_intersect_key($nodes["mission-{$done->id}"], array_flip(['color', 'size'])));
        $this->assertArrayHasKey("intel-{$old->id}", $nodes);

        $this->assertSame(["mission-{$done->id}"], array_keys($this->nodes(['types' => ['mission'], 'status' => ['completed']])));

        $this->getJson('/api/v1/graph?types[]=villains&days=0')->assertJsonValidationErrors(['types.0', 'days']);
    }

    public function test_habit_nodes_grow_with_the_streak(): void
    {
        $habit = Arsenal::factory()->for($this->user)->create(['created_at' => '2026-09-01']);
        foreach (range(1, 12) as $daysAgo) {
            ArsenalLog::create(['arsenal_id' => $habit->id, 'user_id' => $this->user->id, 'date' => now()->subDays($daysAgo)->toDateString(), 'completed' => true]);
        }

        $node = $this->nodes()["arsenal-{$habit->id}"];
        $this->assertSame(12, $node['current_streak']);
        $this->assertSame(16, $node['size']);
    }

    public function test_the_demo_seeder_builds_the_story(): void
    {
        $this->seed(GraphDemoSeeder::class);
        $this->actingAs(User::where('email', GraphDemoSeeder::EMAIL)->sole(), 'sanctum');

        $response = $this->getJson('/api/v1/graph')->assertOk();
        $nodes = collect($response->json('data.nodes'));
        $edges = collect($response->json('data.edges'));
        $connected = $edges->flatMap(fn (array $edge) => [$edge['source'], $edge['target']])->unique();

        $this->assertSame(['arsenal' => 8, 'case' => 5, 'intel' => 14, 'mission' => 17], $nodes->countBy('type')->sortKeys()->all());
        $this->assertSame(2, $edges->where('type', 'depends_on')->count());

        $isolated = $nodes->where('type', 'mission')->reject(fn (array $node) => $connected->contains($node['id']))->pluck('label')->sort()->values()->all();
        $this->assertSame(['Call dentist for appointment', 'Renew car insurance', "Reply to mom's email"], $isolated);
        $this->assertFalse($connected->contains($nodes->firstWhere('label', 'Personal Finance Overhaul')['id']));
    }
}
