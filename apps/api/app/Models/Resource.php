<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * One income or expense transaction.
 *
 * A recurring transaction is a template: App\Services\RecurringResources
 * adds a copy (recurring = false, `recurring_source_id` set) for each date it
 * falls due, counting from the template's own date.
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
    use HasFactory;

    public const DEFAULT_CATEGORIES = [
        'expense' => ['Food', 'Transport', 'Housing', 'Utilities', 'Entertainment', 'Health', 'Education', 'Shopping', 'Subscriptions', 'Other'],
        'income' => ['Salary', 'Freelance', 'Investment', 'Gift', 'Other'],
    ];

    public const FREQUENCIES = ['daily', 'weekly', 'monthly', 'yearly'];

    /** New transactions made from the savings goal modal use this category. */
    public const SAVINGS_CATEGORY = 'Savings';

    protected $attributes = ['recurring' => false];

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

    public function savingsGoal(): BelongsTo
    {
        return $this->belongsTo(SavingsGoal::class);
    }

    public function recurringSource(): BelongsTo
    {
        return $this->belongsTo(self::class, 'recurring_source_id');
    }

    public function occurrences(): HasMany
    {
        return $this->hasMany(self::class, 'recurring_source_id');
    }

    public function scopeIncome(Builder $query): void
    {
        $query->where('type', 'income');
    }

    public function scopeExpense(Builder $query): void
    {
        $query->where('type', 'expense');
    }

    public function scopeInMonth(Builder $query, Carbon|CarbonImmutable $month): void
    {
        $query->whereDate('date', '>=', $month->copy()->startOfMonth()->toDateString())
            ->whereDate('date', '<=', $month->copy()->endOfMonth()->toDateString());
    }

    /**
     * The template's nth repeat. Months and years don't overflow, and count
     * from the original date, so the 31st becomes the 28th in February and
     * the 31st again in March.
     */
    public function occurrence(int $n): CarbonImmutable
    {
        $start = CarbonImmutable::parse($this->date->toDateString());

        return match ($this->recurring_frequency) {
            'daily' => $start->addDays($n),
            'weekly' => $start->addWeeks($n),
            'yearly' => $start->addYearsNoOverflow($n),
            default => $start->addMonthsNoOverflow($n),
        };
    }
}
