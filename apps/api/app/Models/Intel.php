<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * One journal entry.
 */
#[Table('intel')]
#[Fillable([
    'date',
    'content',
    'mood',
    'energy_level',
    'stress_level',
    'gratitude',
    'wins',
    'struggles',
    'tags',
    'sentiment',
    'sentiment_label',
])]
class Intel extends Model
{
    protected function casts(): array
    {
        return [
            'date' => 'date',
            'energy_level' => 'integer',
            'stress_level' => 'integer',
            'wins' => 'array',
            'struggles' => 'array',
            'tags' => 'array',
            'sentiment' => 'decimal:2',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeBetween(Builder $query, Carbon|string $from, Carbon|string $to): void
    {
        $query->whereBetween('date', [$from, $to]);
    }
}
