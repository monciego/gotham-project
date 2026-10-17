<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * One calendar event, or a focus block (`kind`).
 *
 * Times are stored in UTC. All-day events run from midnight to midnight in
 * the user's timezone, `end_time` exclusive. A recurring event's
 * `recurring_rule` is {"freq": daily|weekly|monthly|yearly, "until": Y-m-d|null};
 * App\Services\Operations expands it into occurrences.
 */
#[Fillable([
    'mission_id',
    'title',
    'description',
    'start_time',
    'end_time',
    'all_day',
    'category',
    'color',
    'recurring',
    'recurring_rule',
    'reminder_minutes',
])]
class Operation extends Model
{
    use HasFactory;

    public const CATEGORIES = ['work', 'personal', 'health', 'social', 'other'];

    /** Gold and green are kept for missions, focus blocks and habits. */
    public const COLORS = ['gray', 'blue', 'purple', 'red', 'teal', 'pink'];

    public const REMINDERS = [15, 30, 60, 1440];

    public const FREQUENCIES = ['daily', 'weekly', 'monthly', 'yearly'];

    public const FOCUS_BLOCK_TITLE = '🎯 Focus Block';

    public const FOCUS_BLOCK_MINUTES = 120;

    protected $attributes = ['kind' => 'event', 'all_day' => false, 'recurring' => false];

    protected function casts(): array
    {
        return [
            'start_time' => 'immutable_datetime',
            'end_time' => 'immutable_datetime',
            'all_day' => 'boolean',
            'recurring' => 'boolean',
            'recurring_rule' => 'array',
            'reminder_minutes' => 'integer',
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

    public function isFocusBlock(): bool
    {
        return $this->kind === 'focus_block';
    }

    /** Operations that overlap the given range, for calendar views. */
    public function scopeBetween(Builder $query, Carbon|CarbonImmutable $from, Carbon|CarbonImmutable $to): void
    {
        $query->where('start_time', '<', $to)->where('end_time', '>', $from);
    }

    public function scopeUpcoming(Builder $query): void
    {
        $query->where('start_time', '>=', now())->orderBy('start_time');
    }
}
