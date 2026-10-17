<?php

namespace App\Models;

use App\Support\RichText;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * One journal entry, at most one per day. `content` is sanitized HTML
 * (App\Support\RichText); sentiment is scored from its text.
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
    use HasFactory;

    public const MOODS = ['great', 'good', 'okay', 'bad', 'terrible'];

    /** For averaging moods: great = 5 … terrible = 1. */
    public const MOOD_SCORES = ['great' => 5, 'good' => 4, 'okay' => 3, 'bad' => 2, 'terrible' => 1];

    public const XP = 5;

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'energy_level' => 'integer',
            'stress_level' => 'integer',
            'tags' => 'array',
            'sentiment' => 'decimal:4',
            'xp_awarded' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** The entry's words, without markup. */
    public function plainContent(): string
    {
        return RichText::plain($this->content ?? '');
    }

    public function scopeBetween(Builder $query, Carbon|string $from, Carbon|string $to): void
    {
        $query->whereBetween('date', [$from, $to]);
    }
}
