<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A behaviour pattern Alfred has detected for a user.
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
