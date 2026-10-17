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
 * A monthly spending limit for one expense category. A month without any
 * budgets uses the latest earlier month's (see App\Services\Finance).
 */
#[Fillable(['category', 'monthly_limit', 'month'])]
class Budget extends Model
{
    use HasFactory;

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

    public function scopeForMonth(Builder $query, Carbon|CarbonImmutable $month): void
    {
        $query->whereDate('month', $month->copy()->startOfMonth()->toDateString());
    }
}
