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

/**
 * One habit in the user's Arsenal.
 *
 * `frequency` depends on `type`:
 * - daily, measurable, yes_no: ignored, due every day
 * - specific_days: {"days": [1, 3, 5]}, ISO weekdays (1 = Monday, 7 = Sunday)
 * - interval: {"every": 3}, due every N days counting from the day it was created
 * - weekly: {"times": 3}, due any day until done that many times in the week
 */
#[Table('arsenal')]
#[Fillable([
    'name',
    'description',
    'category',
    'type',
    'frequency',
    'target_value',
    'unit',
    'reminder_time',
    'current_streak',
    'best_streak',
    'active',
    'mode_specific',
])]
class Arsenal extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'frequency' => 'array',
            'target_value' => 'integer',
            'current_streak' => 'integer',
            'best_streak' => 'integer',
            'active' => 'boolean',
            'mode_specific' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function logs(): HasMany
    {
        return $this->hasMany(ArsenalLog::class);
    }

    public function scopeActive(Builder $query): void
    {
        $query->where('active', true);
    }

    public function isWeekly(): bool
    {
        return $this->type === 'weekly';
    }

    /** First day the habit counts, in the given timezone. */
    public function startDate(string $timezone): CarbonImmutable
    {
        return CarbonImmutable::parse($this->created_at)->setTimezone($timezone)->startOfDay();
    }

    /** Whether the habit is scheduled on this day. Weekly habits can be done any day. */
    public function isDueOn(CarbonImmutable $day, string $timezone): bool
    {
        return match ($this->type) {
            'specific_days' => in_array($day->dayOfWeekIso, $this->frequency['days'] ?? [], true),
            'interval' => (int) $this->startDate($timezone)->diffInDays($day) % max(1, (int) ($this->frequency['every'] ?? 1)) === 0,
            default => true,
        };
    }
}
