<?php

namespace App\Services;

use App\Models\Budget;
use App\Models\Resource;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

/**
 * Spending, budgets and Alfred's budget alerts. Months are CarbonImmutable
 * dates on their first day.
 */
class Finance
{
    /** "2026-10", or the user's current month. */
    public function month(User $user, ?string $month): CarbonImmutable
    {
        return $month
            ? CarbonImmutable::createFromFormat('!Y-m', $month)
            : $user->today()->startOfMonth();
    }

    /**
     * Expenses by category for a month, largest first.
     *
     * @return Collection<string, float>
     */
    public function spentByCategory(User $user, CarbonImmutable $month): Collection
    {
        return $user->resources()->expense()->inMonth($month)
            ->selectRaw('category, sum(amount) as total')
            ->groupBy('category')
            ->pluck('total', 'category')
            ->map(fn ($total) => round((float) $total, 2))
            ->sortDesc();
    }

    /**
     * The budgets that apply in a month: its own, or, when it has none, the
     * latest earlier month's. `carried_over` tells which.
     *
     * @return array{budgets: Collection<int, Budget>, carried_over: bool, from: CarbonImmutable|null}
     */
    public function budgetsFor(User $user, CarbonImmutable $month): array
    {
        $own = $user->budgets()->forMonth($month)->orderBy('category')->get();
        if ($own->isNotEmpty()) {
            return ['budgets' => $own, 'carried_over' => false, 'from' => $month];
        }

        $latest = $user->budgets()->whereDate('month', '<', $month->toDateString())->max('month');
        if ($latest === null) {
            return ['budgets' => collect(), 'carried_over' => false, 'from' => null];
        }

        $from = CarbonImmutable::parse($latest)->startOfMonth();

        return ['budgets' => $user->budgets()->forMonth($from)->orderBy('category')->get(), 'carried_over' => true, 'from' => $from];
    }

    /**
     * Each budget with what's been spent against it.
     *
     * @return Collection<int, array<string, mixed>>
     */
    public function budgetProgress(User $user, CarbonImmutable $month): Collection
    {
        ['budgets' => $budgets, 'carried_over' => $carried] = $this->budgetsFor($user, $month);
        $spent = $this->spentByCategory($user, $month);

        return $budgets->map(function (Budget $budget) use ($spent, $carried) {
            $limit = (float) $budget->monthly_limit;
            $used = $spent->get($budget->category, 0.0);

            return [
                // A carried-over budget isn't saved for this month yet.
                'id' => $carried ? null : $budget->id,
                'category' => $budget->category,
                'monthly_limit' => $limit,
                'spent' => $used,
                'remaining' => round($limit - $used, 2),
                'percentage' => $limit > 0 ? (int) round($used / $limit * 100) : null,
            ];
        })->values();
    }

    /**
     * Sets a category's limit for a month. Matched with whereDate rather than
     * updateOrCreate, because SQLite stores dates with a time.
     */
    public function setBudget(User $user, string $category, CarbonImmutable $month, float|string $limit): Budget
    {
        $budget = $user->budgets()->forMonth($month)->where('category', $category)->first()
            ?? $user->budgets()->make(['category' => $category, 'month' => $month->toDateString()]);
        $budget->monthly_limit = $limit;
        $budget->save();

        return $budget;
    }

    /** After an expense is saved: Alfred speaks up once per category and month that goes over. */
    public function checkBudget(User $user, Resource $expense): void
    {
        if ($expense->type !== 'expense') {
            return;
        }

        $month = CarbonImmutable::parse($expense->date->toDateString())->startOfMonth();
        $budget = $this->budgetsFor($user, $month)['budgets']->firstWhere('category', $expense->category);
        if ($budget === null) {
            return;
        }

        $limit = (float) $budget->monthly_limit;
        $spent = $this->spentByCategory($user, $month)->get($expense->category, 0.0);
        $title = "Over budget: {$expense->category}, {$month->format('F Y')}";

        if ($spent <= $limit || $user->alfredMessages()->where('title', $title)->exists()) {
            return;
        }

        $user->alfredMessages()->create([
            'priority' => 'high',
            'mood' => 'concerned',
            'title' => $title,
            'message' => sprintf(
                "You've spent $%s of your $%s %s budget, sir. Perhaps we tighten the belt until month's end.",
                number_format($spent, 2),
                number_format($limit, 2),
                $expense->category,
            ),
            'actions' => [['label' => 'Review budget', 'href' => '/resources/budget']],
        ]);
    }

    /**
     * Past months (before the current one) where every budget in force was kept.
     */
    public function monthsWithinBudget(User $user): int
    {
        $first = $user->budgets()->min('month');
        if ($first === null) {
            return 0;
        }

        $count = 0;
        $current = $user->today()->startOfMonth();

        for ($month = CarbonImmutable::parse($first)->startOfMonth(); $month->lt($current); $month = $month->addMonth()) {
            $spent = $this->spentByCategory($user, $month);
            $budgets = $this->budgetsFor($user, $month)['budgets'];

            if ($budgets->isNotEmpty() && $budgets->every(fn (Budget $budget) => $spent->get($budget->category, 0.0) <= (float) $budget->monthly_limit)) {
                $count++;
            }
        }

        return $count;
    }
}
