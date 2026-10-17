<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'mission_id',
    'start_time',
    'end_time',
    'duration_minutes',
    'completed',
    'distractions',
    'energy_before',
    'energy_after',
    'notes',
])]
class FocusSession extends Model
{
    use HasFactory;

    /** XP for every full block of focused minutes. */
    public const XP_PER_BLOCK = 5;

    public const BLOCK_MINUTES = 25;

    protected function casts(): array
    {
        return [
            'start_time' => 'datetime',
            'end_time' => 'datetime',
            'duration_minutes' => 'integer',
            'completed' => 'boolean',
            'distractions' => 'integer',
            'xp_awarded' => 'integer',
            'energy_before' => 'integer',
            'energy_after' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function mission(): BelongsTo
    {
        return $this->belongsTo(Mission::class);
    }

    public function isRunning(): bool
    {
        return $this->end_time === null;
    }

    /**
     * Ends the session. Time counts from the start up to the planned length, so
     * a timer left running in a sleeping tab doesn't log hours. The mission's
     * `actual_minutes` is recalculated from its completed sessions.
     */
    public function finish(bool $completed): void
    {
        // Whole minutes, as the end-early prompt counts them. A completed session counts at least one.
        $elapsed = (int) floor($this->start_time->diffInMinutes(now()));

        $this->fill([
            'end_time' => now(),
            'duration_minutes' => max($completed ? 1 : 0, min($elapsed, $this->duration_minutes)),
            'completed' => $completed,
        ])->save();

        $this->mission?->recalculateActualMinutes();
    }

    /** +5 XP per full 25 minutes. */
    public function xpReward(): int
    {
        return intdiv($this->duration_minutes, self::BLOCK_MINUTES) * self::XP_PER_BLOCK;
    }

    public function scopeCompleted(Builder $query): void
    {
        $query->where('completed', true);
    }

    /** Sessions that have started but not ended. */
    public function scopeRunning(Builder $query): void
    {
        $query->whereNull('end_time');
    }

    public function scopeToday(Builder $query, ?string $timezone = null): void
    {
        $query->whereDate('start_time', now($timezone)->toDateString());
    }
}
