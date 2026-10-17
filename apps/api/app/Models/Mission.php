<?php

namespace App\Models;

use App\Models\Concerns\OrdersByPriority;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'case_id',
    'title',
    'description',
    'why_it_matters',
    'priority',
    'status',
    'due_date',
    'due_time',
    'estimated_minutes',
    'actual_minutes',
    'times_postponed',
    'energy_required',
    'tags',
    'notes',
    'past_self_message',
    'completed_at',
    'abandon_reason',
])]
class Mission extends Model
{
    use HasFactory, OrdersByPriority, SoftDeletes;

    protected function casts(): array
    {
        return [
            'due_date' => 'date',
            'estimated_minutes' => 'integer',
            'actual_minutes' => 'integer',
            'times_postponed' => 'integer',
            'tags' => 'array',
            'completed_at' => 'datetime',
            'xp_awarded' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function case(): BelongsTo
    {
        return $this->belongsTo(CaseFile::class, 'case_id');
    }

    /** Missions that must be completed before this one. */
    public function dependencies(): BelongsToMany
    {
        return $this->belongsToMany(self::class, 'mission_dependencies', 'mission_id', 'depends_on_mission_id');
    }

    /** Missions waiting on this one. */
    public function dependents(): BelongsToMany
    {
        return $this->belongsToMany(self::class, 'mission_dependencies', 'depends_on_mission_id', 'mission_id');
    }

    public function operations(): HasMany
    {
        return $this->hasMany(Operation::class);
    }

    public function focusSessions(): HasMany
    {
        return $this->hasMany(FocusSession::class);
    }

    public function subtasks(): HasMany
    {
        return $this->hasMany(Subtask::class)->orderBy('order')->orderBy('id');
    }

    public const XP = ['critical' => 100, 'high' => 75, 'medium' => 50, 'low' => 25];

    public function xpReward(): int
    {
        return self::XP[$this->priority] ?? self::XP['medium'];
    }

    public function isOpen(): bool
    {
        return in_array($this->status, ['not_started', 'in_progress'], true);
    }

    /** Only completed focus sessions count as time put in. */
    public function recalculateActualMinutes(): void
    {
        $this->update(['actual_minutes' => (int) $this->focusSessions()->completed()->sum('duration_minutes')]);
    }

    public function scopeCompleted(Builder $query): void
    {
        $query->where('status', 'completed');
    }

    /** Not completed and not abandoned. */
    public function scopeOpen(Builder $query): void
    {
        $query->whereIn('status', ['not_started', 'in_progress']);
    }

    public function scopeToday(Builder $query, ?string $timezone = null): void
    {
        $query->whereDate('due_date', now($timezone)->toDateString());
    }

    public function scopeOverdue(Builder $query, ?string $timezone = null): void
    {
        $query->open()->whereDate('due_date', '<', now($timezone)->toDateString());
    }

    public function scopePriority(Builder $query, string $priority): void
    {
        $query->where('priority', $priority);
    }
}
