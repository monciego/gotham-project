<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A behaviour pattern Alfred has detected for a user.
 *
 * App\Services\AlfredIntelligence writes them (one row per type) from
 * the last 60 days and removes those that no longer hold. Types:
 * - energy_pattern: {"peak_hour": 0-23, "sessions"}, the hour focus sessions
 *   start with the most energy, in the user's timezone. Focus blocks start
 *   there once confidence reaches 0.7 (App\Services\Operations).
 * - habit_vs_missions, energy_by_day, procrastination_by_day, mood_vs_habits,
 *   focus_vs_completion, productive_day, spending_trend: the numbers behind
 *   each insight.
 */
#[Table('system_intelligence')]
#[Fillable(['pattern_type', 'pattern_data', 'confidence'])]
class SystemIntelligence extends Model
{
    const CREATED_AT = 'discovered_at';

    protected function casts(): array
    {
        return [
            'pattern_data' => 'array',
            'confidence' => 'decimal:2',
            'discovered_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeOfType(Builder $query, string $patternType): void
    {
        $query->where('pattern_type', $patternType);
    }

    public function scopeConfident(Builder $query, float $minimum = 0.7): void
    {
        $query->where('confidence', '>=', $minimum);
    }
}
