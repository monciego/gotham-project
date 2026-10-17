<?php

namespace App\Services;

use App\Models\Arsenal;
use App\Models\CaseFile;
use App\Models\Intel;
use App\Models\Mission;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * The Gotham Map: the user's cases, missions, habits and recent Intel as
 * nodes, and how they connect as edges.
 *
 * Edges:
 * - belongs_to: mission → its case
 * - depends_on: mission → the mission it waits on ("blocked by")
 * - correlated: habit → Intel entry, when the habit was completed on the
 *   entry's day (one edge per pair)
 * Focus time isn't an edge: it's `focus_minutes` on mission nodes, drawn as
 * the thickness of their border.
 */
class GothamGraph
{
    public const TYPES = ['case', 'mission', 'arsenal', 'intel'];

    public const OPEN_STATUSES = ['not_started', 'in_progress'];

    /** Case colour presets, as the web shows them; no colour means gold. */
    private const CASE_COLORS = [
        'gray' => '#6B7280',
        'blue' => '#3B82F6',
        'purple' => '#8B5CF6',
        'red' => '#EF4444',
        'teal' => '#14B8A6',
        'pink' => '#EC4899',
    ];

    private const GOLD = '#D4AF37';

    private const PRIORITY_COLORS = [
        'critical' => '#DC2626',
        'high' => '#F97316',
        'medium' => '#3B82F6',
        'low' => '#6B7280',
    ];

    private const MOOD_COLORS = [
        'great' => '#10B981',
        'good' => '#3B82F6',
        'okay' => '#F59E0B',
        'bad' => '#F97316',
        'terrible' => '#EF4444',
    ];

    private const HABIT_COLOR = '#10B981';

    private const MUTED = '#4B5563';

    public function __construct(private ArsenalStreaks $streaks) {}

    /**
     * @param  array{types?: list<string>, status?: list<string>, show_completed?: bool, days?: int}  $filters
     * @return array{nodes: list<array<string, mixed>>, edges: list<array<string, mixed>>}
     */
    public function build(User $user, array $filters = []): array
    {
        $types = $filters['types'] ?? self::TYPES;
        $showCompleted = $filters['show_completed'] ?? false;
        $days = $filters['days'] ?? 30;
        $statuses = $filters['status'] ?? [...self::OPEN_STATUSES, ...($showCompleted ? ['completed'] : [])];

        $cases = in_array('case', $types, true) ? $this->cases($user, $showCompleted) : collect();
        $missions = in_array('mission', $types, true) ? $this->missions($user, $statuses) : collect();
        $habits = in_array('arsenal', $types, true) ? $this->habits($user) : collect();
        $intel = in_array('intel', $types, true) ? $this->intel($user, $days) : collect();

        $nodes = [
            ...$cases->map(fn (CaseFile $case) => $this->caseNode($case)),
            ...$missions->map(fn (Mission $mission) => $this->missionNode($mission, $user)),
            ...$habits->map(fn (array $habit) => $this->habitNode($habit)),
            ...$intel->map(fn (Intel $entry) => $this->intelNode($entry)),
        ];

        $edges = [
            ...$this->belongsTo($missions, $cases),
            ...$this->dependsOn($missions),
            ...$this->correlated($user, $habits, $intel),
        ];

        return ['nodes' => array_values($nodes), 'edges' => array_values($edges)];
    }

    private function cases(User $user, bool $showCompleted): Collection
    {
        return $user->cases()
            ->withMissionCounts()
            ->whereIn('status', ['planning', 'active', 'on_hold', ...($showCompleted ? ['completed'] : [])])
            ->orderBy('id')
            ->get();
    }

    /** With the minutes of their completed focus sessions. */
    private function missions(User $user, array $statuses): Collection
    {
        return $user->missions()
            ->whereIn('status', $statuses)
            ->with('dependencies:id')
            ->withSum(['focusSessions as focus_minutes' => fn ($query) => $query->where('completed', true)], 'duration_minutes')
            ->withCount('focusSessions as focus_sessions')
            ->orderBy('id')
            ->get();
    }

    /** Active habits with their computed streaks. @return Collection<int, array{habit: Arsenal, current_streak: int, best_streak: int}> */
    private function habits(User $user): Collection
    {
        $habits = $user->arsenal()->where('active', true)->orderBy('id')->get();
        $logs = $this->streaks->logsFor($habits, $user->today());

        return $habits->map(function (Arsenal $habit) use ($logs, $user) {
            $present = $this->streaks->present($habit, $logs->get($habit->id, collect()), $user);

            return ['habit' => $habit, 'current_streak' => $present['current_streak'], 'best_streak' => $present['best_streak']];
        });
    }

    /** Entries from the last `$days` days, today included. */
    private function intel(User $user, int $days): Collection
    {
        $today = $user->today();

        return $user->intel()
            ->whereDate('date', '>', $today->subDays($days)->toDateString())
            ->whereDate('date', '<=', $today->toDateString())
            ->orderBy('date')
            ->get();
    }

    private function caseNode(CaseFile $case): array
    {
        return [
            'id' => "case-{$case->id}",
            'type' => 'case',
            'label' => $case->name,
            'status' => $case->status,
            'progress' => $case->progress,
            'color' => self::CASE_COLORS[$case->color] ?? self::GOLD,
            'size' => 32,
            'data' => [
                'id' => $case->id,
                'name' => $case->name,
                'status' => $case->status,
                'progress' => $case->progress,
                'missions_total' => (int) $case->missions_total,
                'missions_completed' => (int) $case->missions_completed,
                'target_end_date' => $case->target_end_date?->toDateString(),
            ],
        ];
    }

    private function missionNode(Mission $mission, User $user): array
    {
        $completed = $mission->status === 'completed';
        $dueDate = $mission->due_date->toDateString();

        return [
            'id' => "mission-{$mission->id}",
            'type' => 'mission',
            'label' => $mission->title,
            'status' => $mission->status,
            'priority' => $mission->priority,
            'times_postponed' => $mission->times_postponed,
            // Finished work recedes.
            'color' => $completed ? self::MUTED : self::PRIORITY_COLORS[$mission->priority],
            'size' => $completed ? 14 : 20,
            'focus_minutes' => (int) $mission->focus_minutes,
            'data' => [
                'id' => $mission->id,
                'title' => $mission->title,
                'priority' => $mission->priority,
                'status' => $mission->status,
                'why_it_matters' => $mission->why_it_matters,
                'due_date' => $dueDate,
                'is_overdue' => in_array($mission->status, self::OPEN_STATUSES, true) && $dueDate < $user->today()->toDateString(),
                'times_postponed' => $mission->times_postponed,
                'past_self_message' => $mission->past_self_message,
                'case_id' => $mission->case_id,
                'dependency_ids' => $mission->dependencies->pluck('id')->all(),
                'focus_minutes' => (int) $mission->focus_minutes,
                'focus_sessions' => (int) $mission->focus_sessions,
            ],
        ];
    }

    /** @param  array{habit: Arsenal, current_streak: int, best_streak: int}  $item */
    private function habitNode(array $item): array
    {
        $habit = $item['habit'];

        return [
            'id' => "arsenal-{$habit->id}",
            'type' => 'arsenal',
            'label' => $habit->name,
            'current_streak' => $item['current_streak'],
            'color' => self::HABIT_COLOR,
            // Longer streaks, bigger nodes: 14 to 24.
            'size' => 14 + min(intdiv($item['current_streak'], 5), 10),
            'data' => [
                'id' => $habit->id,
                'name' => $habit->name,
                'category' => $habit->category,
                'current_streak' => $item['current_streak'],
                'best_streak' => $item['best_streak'],
            ],
        ];
    }

    private function intelNode(Intel $entry): array
    {
        return [
            'id' => "intel-{$entry->id}",
            'type' => 'intel',
            'label' => $entry->date->format('M j'),
            'mood' => $entry->mood,
            'color' => self::MOOD_COLORS[$entry->mood] ?? self::MUTED,
            'size' => 12,
            'data' => [
                'id' => $entry->id,
                'date' => $entry->date->toDateString(),
                'mood' => $entry->mood,
                'energy_level' => $entry->energy_level,
                'stress_level' => $entry->stress_level,
                'excerpt' => Str::limit($entry->plainContent(), 100, '…'),
            ],
        ];
    }

    private function belongsTo(Collection $missions, Collection $cases): array
    {
        $caseIds = $cases->pluck('id')->flip();

        return $missions
            ->filter(fn (Mission $mission) => $mission->case_id !== null && $caseIds->has($mission->case_id))
            ->map(fn (Mission $mission) => $this->edge("mission-{$mission->id}", "case-{$mission->case_id}", 'belongs_to'))
            ->all();
    }

    private function dependsOn(Collection $missions): array
    {
        $ids = $missions->pluck('id')->flip();

        return $missions->flatMap(fn (Mission $mission) => $mission->dependencies
            ->filter(fn (Mission $blocker) => $ids->has($blocker->id))
            ->map(fn (Mission $blocker) => $this->edge("mission-{$mission->id}", "mission-{$blocker->id}", 'depends_on', 'blocked by'))
        )->all();
    }

    /** Habit → entry, for each habit completed on an entry's day. */
    private function correlated(User $user, Collection $habits, Collection $intel): array
    {
        if ($habits->isEmpty() || $intel->isEmpty()) {
            return [];
        }

        $entriesByDate = $intel->keyBy(fn (Intel $entry) => $entry->date->toDateString());

        // Compared as Y-m-d strings: SQLite (the tests) stores dates with a time.
        return DB::table('arsenal_logs')
            ->where('user_id', $user->id)
            ->where('completed', true)
            ->whereIn('arsenal_id', $habits->map(fn (array $item) => $item['habit']->id))
            ->whereDate('date', '>=', $intel->first()->date->toDateString())
            ->whereDate('date', '<=', $intel->last()->date->toDateString())
            ->get(['arsenal_id', 'date'])
            ->map(fn ($log) => [$log->arsenal_id, $entriesByDate->get(substr((string) $log->date, 0, 10))])
            ->filter(fn (array $pair) => $pair[1] !== null)
            ->unique(fn (array $pair) => "{$pair[0]}-{$pair[1]->id}")
            ->map(fn (array $pair) => $this->edge("arsenal-{$pair[0]}", "intel-{$pair[1]->id}", 'correlated', 'same day'))
            ->values()
            ->all();
    }

    private function edge(string $source, string $target, string $type, string $label = ''): array
    {
        return ['id' => "edge-{$source}-{$target}", 'source' => $source, 'target' => $target, 'type' => $type, 'label' => $label];
    }
}
