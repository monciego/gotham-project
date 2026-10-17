<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * One habit in the user's Arsenal.
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
}
