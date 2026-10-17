<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * One calendar event.
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
])]
class Operation extends Model
{
    protected function casts(): array
    {
        return [
            'start_time' => 'datetime',
            'end_time' => 'datetime',
            'all_day' => 'boolean',
            'recurring' => 'boolean',
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

    /** Operations that overlap the given range, for calendar views. */
    public function scopeBetween(Builder $query, Carbon $from, Carbon $to): void
    {
        $query->where('start_time', '<', $to)->where('end_time', '>', $from);
    }

    public function scopeUpcoming(Builder $query): void
    {
        $query->where('start_time', '>=', now())->orderBy('start_time');
    }
}
