<?php

namespace Tests\Feature;

use App\Jobs\GenerateWeeklyReportsJob;
use App\Models\Arsenal;
use App\Models\ArsenalLog;
use App\Models\FocusSession;
use App\Models\Intel;
use App\Models\Mission;
use App\Models\User;
use App\Services\AlfredIntelligence;
use App\Services\ReportService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OverviewTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        // Saturday, Oct 17, 09:00 in Manila. The week began Monday, Oct 12.
        $this->travelTo('2026-10-17 01:00:00');
        $this->user = User::factory()->create(['timezone' => 'Asia/Manila']);
        $this->actingAs($this->user, 'sanctum');
    }

    /** A Manila wall-clock time as the UTC instant the database stores. */
    private function manila(string $time): CarbonImmutable
    {
        return CarbonImmutable::parse($time, 'Asia/Manila')->utc();
    }

    private function completedMission(string $at, int $xp = 50): Mission
    {
        $mission = Mission::factory()->for($this->user)->create([
            'status' => 'completed',
            'completed_at' => $this->manila($at),
            'due_date' => substr($at, 0, 10),
        ]);
        $mission->forceFill(['xp_awarded' => $xp])->save();

        return $mission;
    }

    private function habit(string $createdOn, array $doneOn): Arsenal
    {
        $habit = Arsenal::factory()->for($this->user)->create(['created_at' => $this->manila("{$createdOn} 08:00")]);
        foreach ($doneOn as $date) {
            ArsenalLog::create(['arsenal_id' => $habit->id, 'user_id' => $this->user->id, 'date' => $date, 'completed' => true]);
        }

        return $habit;
    }

    private function seedWeek(): void
    {
        // 01:00 on Tuesday in Manila is still Monday in UTC; it belongs to Tuesday.
        FocusSession::factory()->for($this->user)->create([
            'start_time' => $this->manila('2026-10-13 01:00'), 'duration_minutes' => 50, 'completed' => true, 'xp_awarded' => 10,
        ]);
        FocusSession::factory()->for($this->user)->create(['start_time' => $this->manila('2026-10-11 10:00'), 'duration_minutes' => 25, 'completed' => true]);
        // Abandoned sessions don't count.
        FocusSession::factory()->for($this->user)->create(['start_time' => $this->manila('2026-10-14 10:00'), 'duration_minutes' => 15, 'completed' => false]);

        $this->completedMission('2026-10-14 10:00');
        $this->completedMission('2026-10-16 18:00');
        $this->completedMission('2026-10-07 10:00');

        $this->habit('2026-10-10', ['2026-10-12', '2026-10-13']);
        $this->habit('2026-10-10', ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16']);

        Intel::factory()->for($this->user)->create(['date' => '2026-10-15', 'mood' => 'good', 'energy_level' => 7]);
    }

    public function test_the_week_in_numbers(): void
    {
        $this->seedWeek();

        $response = $this->getJson('/api/v1/overview?period=week')
            ->assertOk()
            ->assertJsonPath('data.period', ['name' => 'week', 'start' => '2026-10-12', 'end' => '2026-10-17', 'days' => 6])
            ->assertJsonPath('data.key_metrics.total_focus_minutes', 50)
            ->assertJsonPath('data.key_metrics.missions_completed', 2)
            // Oct 6–11 had one.
            ->assertJsonPath('data.key_metrics.missions_completed_previous', 1)
            ->assertJsonPath('data.key_metrics.missions_change', 100)
            // 7 of 10 due habit-days; today isn't counted until it's over.
            ->assertJsonPath('data.key_metrics.habit_completion_rate', 70)
            // The first habit's streak broke on three straight misses.
            ->assertJsonPath('data.key_metrics.active_streaks_count', 1)
            ->assertJsonPath('data.key_metrics.xp_earned', 110)
            ->assertJsonCount(6, 'data.focus_by_day')
            ->assertJsonPath('data.focus_by_day.1', ['date' => '2026-10-13', 'minutes' => 50])
            ->assertJsonPath('data.missions_by_week', [['week' => '2026-10-12', 'count' => 2]])
            ->assertJsonPath('data.energy_trend', [['date' => '2026-10-15', 'avg_energy' => 7]])
            ->assertJsonPath('data.mood_trend', [['date' => '2026-10-15', 'mood_score' => 4]]);

        $heatmap = collect($response->json('data.habit_heatmap'))->pluck('completion_rate', 'date');
        $this->assertSame(100, $heatmap['2026-10-12']);
        $this->assertSame(50, $heatmap['2026-10-14']);
        $this->assertNull($heatmap['2026-10-17']);
    }

    public function test_custom_periods_and_validation(): void
    {
        $this->seedWeek();

        $this->getJson('/api/v1/overview?period=custom&start=2026-10-13&end=2026-10-14')
            ->assertOk()
            ->assertJsonPath('data.period.days', 2)
            ->assertJsonPath('data.key_metrics.total_focus_minutes', 50)
            ->assertJsonPath('data.key_metrics.missions_completed', 1);

        $this->getJson('/api/v1/overview?period=decade')->assertJsonValidationErrors(['period']);
        $this->getJson('/api/v1/overview?period=custom')->assertJsonValidationErrors(['start', 'end']);
        $this->getJson('/api/v1/overview?period=custom&start=2026-10-14&end=2026-10-13')->assertJsonValidationErrors(['end']);
        $this->getJson('/api/v1/overview?period=custom&start=2025-01-01&end=2026-10-17')->assertJsonValidationErrors(['end']);
        $this->getJson('/api/v1/overview')->assertOk()->assertJsonPath('data.period.start', '2026-10-01');
    }

    public function test_insights_need_data_and_are_cached_for_a_day(): void
    {
        $this->postJson('/api/v1/overview/insights/generate')
            ->assertOk()
            ->assertJsonPath('message', 'Insufficient data, sir. Keep using Alfred. Patterns will emerge.')
            ->assertJsonPath('data.insights', []);

        $first = $this->getJson('/api/v1/overview/insights')->json('data.generated_at');
        $this->travel(5)->minutes();
        $this->assertSame($first, $this->getJson('/api/v1/overview/insights')->json('data.generated_at'));
        $this->assertNotSame($first, $this->postJson('/api/v1/overview/insights/generate')->json('data.generated_at'));
    }

    public function test_alfred_finds_the_habit_that_goes_with_more_missions_and_saves_the_pattern(): void
    {
        // A pattern that no longer holds is removed; other services' patterns stay.
        $this->user->systemIntelligence()->create(['pattern_type' => 'energy_pattern', 'pattern_data' => ['peak_hour' => 9], 'confidence' => 0.9]);
        $this->user->systemIntelligence()->create(['pattern_type' => 'something_else', 'pattern_data' => [], 'confidence' => 0.5]);

        // Thirty days: runs on even days with three missions, misses on odd days with one.
        $habit = Arsenal::factory()->for($this->user)->create(['name' => 'Run', 'created_at' => $this->manila('2026-09-17 08:00')]);
        foreach (range(1, 30) as $daysAgo) {
            $day = CarbonImmutable::parse('2026-10-17')->subDays($daysAgo)->toDateString();
            if ($daysAgo % 2 === 0) {
                ArsenalLog::create(['arsenal_id' => $habit->id, 'user_id' => $this->user->id, 'date' => $day, 'completed' => true]);
            }
            foreach (range(1, $daysAgo % 2 === 0 ? 3 : 1) as $index) {
                $this->completedMission("{$day} 12:00");
            }
        }

        $insights = collect($this->postJson('/api/v1/overview/insights/generate')->assertOk()->json('data.insights'));

        $this->assertSame(
            'You complete 200% more missions on days you complete “Run”.',
            $insights->firstWhere('key', 'habit_vs_missions')['text'],
        );
        $this->assertSame('habit', $insights->firstWhere('key', 'habit_vs_missions')['category']);
        $this->assertSame(200, $this->user->systemIntelligence()->ofType('habit_vs_missions')->sole()->pattern_data['lift_percent']);
        $this->assertFalse($this->user->systemIntelligence()->ofType('energy_pattern')->exists());
        $this->assertTrue($this->user->systemIntelligence()->ofType('something_else')->exists());
    }

    public function test_morning_energy_becomes_the_focus_block_hour(): void
    {
        foreach (range(1, 8) as $daysAgo) {
            $day = CarbonImmutable::parse('2026-10-17')->subDays($daysAgo)->toDateString();
            FocusSession::factory()->for($this->user)->create(['start_time' => $this->manila("{$day} 09:00"), 'energy_before' => 9]);
            FocusSession::factory()->for($this->user)->create(['start_time' => $this->manila("{$day} 15:00"), 'energy_before' => 5]);
        }

        app(AlfredIntelligence::class)->generateInsights($this->user);

        $pattern = $this->user->systemIntelligence()->ofType('energy_pattern')->sole();
        $this->assertSame(9, $pattern->pattern_data['peak_hour']);
        // Sixteen sessions is enough for focus blocks to rely on it.
        $this->assertGreaterThanOrEqual(0.7, (float) $pattern->confidence);
    }

    public function test_correlation(): void
    {
        $this->assertEqualsWithDelta(1.0, AlfredIntelligence::correlation([1, 2, 3, 4], [2, 4, 6, 8]), 0.0001);
        $this->assertEqualsWithDelta(-1.0, AlfredIntelligence::correlation([1, 2, 3], [3, 2, 1]), 0.0001);
        $this->assertNull(AlfredIntelligence::correlation([1, 1, 1], [1, 2, 3]));
        $this->assertNull(AlfredIntelligence::correlation([1, 2], [1, 2]));
    }

    public function test_the_weekly_report_so_far_and_for_a_past_week(): void
    {
        $this->seedWeek();

        $this->getJson('/api/v1/overview/report?period=week')
            ->assertOk()
            ->assertJsonPath('data.week_start', '2026-10-12')
            ->assertJsonPath('data.week_end', '2026-10-18')
            ->assertJsonPath('data.in_progress', true)
            ->assertJsonPath('data.metrics.missions_completed', 2)
            ->assertJsonPath('data.metrics.focus_minutes', 50)
            ->assertJsonPath('data.metrics.average_mood', 4)
            // One mission each on Wednesday and Friday, no focus either day: the tie goes to the earlier.
            ->assertJsonPath('data.best_day.date', '2026-10-14')
            ->assertJsonPath('data.summary', fn (string $summary) => str_starts_with($summary, "Ahead of last week's pace, sir. You completed 2 missions")
                && str_ends_with($summary, "The week isn't over, sir. There is time yet."));

        $this->getJson('/api/v1/overview/report?week=2026-10-07')
            ->assertJsonPath('data.week_start', '2026-10-05')
            ->assertJsonPath('data.in_progress', false)
            ->assertJsonPath('data.metrics.missions_completed', 1)
            ->assertJsonPath('data.summary', fn (string $summary) => str_ends_with($summary, 'Rest well. Next week, we go again.'));

        $this->getJson('/api/v1/overview/report?period=month')->assertJsonValidationErrors(['period']);
    }

    public function test_reports_are_saved_on_sunday_at_eleven_in_the_users_timezone(): void
    {
        $this->seedWeek();

        // 22:30 on Sunday in Manila: too early.
        $this->travelTo('2026-10-18 14:30:00');
        (new GenerateWeeklyReportsJob)->handle(app(ReportService::class));
        $this->assertSame(0, $this->user->weeklyReports()->count());

        $this->travelTo('2026-10-18 15:30:00');
        (new GenerateWeeklyReportsJob)->handle(app(ReportService::class));

        $this->getJson('/api/v1/overview/reports')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.week_start', '2026-10-12')
            ->assertJsonPath('data.0.in_progress', false);
        $this->assertDatabaseHas('alfred_messages', ['user_id' => $this->user->id, 'title' => 'Your weekly report, sir.']);

        // Running again in the same hour replaces it rather than adding another.
        (new GenerateWeeklyReportsJob)->handle(app(ReportService::class));
        $this->assertSame(1, $this->user->weeklyReports()->count());
    }
}
