<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

#[Fillable(['arsenal_id', 'user_id', 'date', 'completed', 'value', 'skipped', 'note', 'completed_at'])]
class ArsenalLog extends Model
{
    protected function casts(): array
    {
        return [
            'date' => 'date',
            'completed' => 'boolean',
            'value' => 'integer',
            'skipped' => 'boolean',
            'completed_at' => 'datetime',
        ];
    }

    public function arsenal(): BelongsTo
    {
        return $this->belongsTo(Arsenal::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeCompleted(Builder $query): void
    {
        $query->where('completed', true);
    }

    public function scopeOnDate(Builder $query, Carbon|string $date): void
    {
        $query->whereDate('date', $date);
    }
}
