<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

#[Fillable(['category', 'monthly_limit', 'month'])]
class Budget extends Model
{
    protected function casts(): array
    {
        return [
            'monthly_limit' => 'decimal:2',
            'month' => 'date',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeForMonth(Builder $query, Carbon $month): void
    {
        $query->whereDate('month', $month->copy()->startOfMonth()->toDateString());
    }
}
