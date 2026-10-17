<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A Case (project). Named CaseFile because "case" is a reserved word in PHP.
 *
 * Progress is 0–100. In `auto` mode it is the share of the case's
 * (non-abandoned) missions that are done, kept up to date by
 * App\Services\CaseProgress; in `manual` mode the user sets it.
 */
#[Table('cases')]
#[Fillable([
    'name',
    'description',
    'status',
    'category',
    'start_date',
    'target_end_date',
    'actual_end_date',
    'progress',
    'progress_mode',
    'color',
    'tags',
    'notes',
])]
class CaseFile extends Model
{
    use HasFactory, SoftDeletes;

    /** Closing a case. */
    public const XP = 500;

    public const COLORS = ['gray', 'blue', 'purple', 'red', 'teal', 'pink'];

    /** Statuses the forms can set. `completed` is only reached through the complete endpoint. */
    public const EDITABLE_STATUSES = ['planning', 'active', 'on_hold', 'archived'];

    /** How many points behind the straight line from start to target still counts as on track. */
    private const SCHEDULE_GRACE = 10;

    protected $attributes = [
        'status' => 'planning',
        'progress' => 0,
        'progress_milestone' => 0,
        'progress_mode' => 'auto',
        'xp_awarded' => 0,
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'target_end_date' => 'date',
            'actual_end_date' => 'date',
            'progress' => 'integer',
            'progress_milestone' => 'integer',
            'xp_awarded' => 'integer',
            'tags' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function missions(): HasMany
    {
        return $this->hasMany(Mission::class, 'case_id');
    }

    public function milestones(): HasMany
    {
        return $this->hasMany(CaseMilestone::class, 'case_id');
    }

    public function progressLogs(): HasMany
    {
        return $this->hasMany(CaseProgressLog::class, 'case_id');
    }

    public function isOpen(): bool
    {
        return in_array($this->status, ['planning', 'active', 'on_hold'], true);
    }

    /**
     * Whether an open case with a target date is keeping pace with a straight
     * line from its start (0%) to its target (100%): on_track or behind.
     * Null for closed cases and cases without a target.
     */
    public function schedule(CarbonImmutable $today): ?string
    {
        if (! $this->isOpen() || $this->target_end_date === null) {
            return null;
        }

        $start = CarbonImmutable::parse($this->start_date->toDateString());
        $target = CarbonImmutable::parse($this->target_end_date->toDateString());
        $day = CarbonImmutable::parse($today->toDateString());

        if ($day->lt($start)) {
            return 'on_track';
        }

        if ($day->gte($target)) {
            return $this->progress >= 100 ? 'on_track' : 'behind';
        }

        $expected = $start->diffInDays($day) / $start->diffInDays($target) * 100;

        return $this->progress + self::SCHEDULE_GRACE >= $expected ? 'on_track' : 'behind';
    }

    /** `missions_total` (not abandoned) and `missions_completed`, as "X/Y missions". */
    public function scopeWithMissionCounts(Builder $query): void
    {
        $query->withCount([
            'missions as missions_total' => fn (Builder $query) => $query->where('status', '!=', 'abandoned'),
            'missions as missions_completed' => fn (Builder $query) => $query->where('status', 'completed'),
        ]);
    }

    public function scopeActive(Builder $query): void
    {
        $query->where('status', 'active');
    }

    /** Still being worked on: not completed and not archived. */
    public function scopeOpen(Builder $query): void
    {
        $query->whereIn('status', ['planning', 'active', 'on_hold']);
    }

    public function scopeCompleted(Builder $query): void
    {
        $query->where('status', 'completed');
    }
}
