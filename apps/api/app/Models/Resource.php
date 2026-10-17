<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * One income or expense transaction.
 */
#[Fillable([
    'type',
    'amount',
    'category',
    'description',
    'date',
    'account',
    'recurring',
    'recurring_frequency',
])]
class Resource extends Model
{
    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'date' => 'date',
            'recurring' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeIncome(Builder $query): void
    {
        $query->where('type', 'income');
    }

    public function scopeExpense(Builder $query): void
    {
        $query->where('type', 'expense');
    }

    public function scopeInMonth(Builder $query, Carbon $month): void
    {
        $query->whereBetween('date', [
            $month->copy()->startOfMonth()->toDateString(),
            $month->copy()->endOfMonth()->toDateString(),
        ]);
    }
}
