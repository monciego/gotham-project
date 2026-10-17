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
    'energy_before',
    'energy_after',
    'notes',
])]
class FocusSession extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'start_time' => 'datetime',
            'end_time' => 'datetime',
            'duration_minutes' => 'integer',
            'completed' => 'boolean',
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
