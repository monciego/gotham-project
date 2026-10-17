<?php

namespace App\Http\Controllers;

use App\Services\Finance;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Monthly limits per expense category. A month with no budgets of its own
 * uses the latest earlier month's until some are saved for it.
 */
class BudgetController extends Controller
{
    /** How many past months recommendations average over. */
    private const RECOMMEND_FROM_MONTHS = 3;

    public function __construct(private Finance $finance) {}

    /**
     * A month's budgets with spending, plus categories spent on without a
     * budget. `carried_over` means they come from `from` and aren't saved for
     * this month yet.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate(['month' => ['sometimes', 'date_format:Y-m']]);
        $user = $request->user();
        $month = $this->finance->month($user, $validated['month'] ?? null);

        ['carried_over' => $carried, 'from' => $from] = $this->finance->budgetsFor($user, $month);
        $budgets = $this->finance->budgetProgress($user, $month);
        $spent = $this->finance->spentByCategory($user, $month);

        return $this->success([
            'month' => $month->format('Y-m'),
            'carried_over' => $carried,
            'from' => $from?->format('Y-m'),
            'budgets' => $budgets,
            'unbudgeted' => $spent->except($budgets->pluck('category')->all())
                ->map(fn (float $amount, string $category) => ['category' => $category, 'spent' => $amount])
                ->values(),
            'total_limit' => round($budgets->sum('monthly_limit'), 2),
            'total_spent' => round($budgets->sum('spent'), 2),
        ]);
    }

    /** Sets one category's limit for a month (creating or replacing it). */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'category' => ['required', 'string', 'max:50'],
            'monthly_limit' => ['required', 'numeric', 'decimal:0,2', 'min:0.01', 'max:99999999.99'],
            'month' => ['sometimes', 'date_format:Y-m'],
        ]);

        $user = $request->user();
        $month = $this->finance->month($user, $validated['month'] ?? null);
        $budget = $this->finance->setBudget($user, trim($validated['category']), $month, $validated['monthly_limit']);

        return $this->success(['id' => $budget->id], 'Budget set.', $budget->wasRecentlyCreated ? 201 : 200);
    }

    public function update(Request $request, int $budget): JsonResponse
    {
        $validated = $request->validate([
            'monthly_limit' => ['required', 'numeric', 'decimal:0,2', 'min:0.01', 'max:99999999.99'],
        ]);

        $request->user()->budgets()->findOrFail($budget)->update($validated);

        return $this->success(message: 'Budget updated.');
    }

    /** Saves a month's whole set: listed categories are set, the month's others removed. */
    public function sync(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'month' => ['sometimes', 'date_format:Y-m'],
            'budgets' => ['present', 'array', 'max:100'],
            'budgets.*.category' => ['required', 'string', 'max:50', 'distinct'],
            'budgets.*.monthly_limit' => ['required', 'numeric', 'decimal:0,2', 'min:0.01', 'max:99999999.99'],
        ]);

        $user = $request->user();
        $month = $this->finance->month($user, $validated['month'] ?? null);

        DB::transaction(function () use ($user, $month, $validated) {
            $categories = collect($validated['budgets'])->map(fn (array $budget) => trim($budget['category']));
            $user->budgets()->forMonth($month)->whereNotIn('category', $categories)->delete();

            foreach ($validated['budgets'] as $budget) {
                $this->finance->setBudget($user, trim($budget['category']), $month, $budget['monthly_limit']);
            }
        });

        return $this->success(message: 'Budgets saved, sir.');
    }

    public function destroy(Request $request, int $budget): JsonResponse
    {
        $request->user()->budgets()->findOrFail($budget)->delete();

        return $this->success(message: 'Budget removed.');
    }

    /** A limit per category from the average of the 3 months before `month`, rounded up to $10. */
    public function recommendations(Request $request): JsonResponse
    {
        $validated = $request->validate(['month' => ['sometimes', 'date_format:Y-m']]);
        $user = $request->user();
        $month = $this->finance->month($user, $validated['month'] ?? null);

        $totals = collect(range(1, self::RECOMMEND_FROM_MONTHS))
            ->flatMap(fn (int $monthsAgo) => $this->finance->spentByCategory($user, $month->subMonthsNoOverflow($monthsAgo))->map(
                fn (float $amount, string $category) => ['category' => $category, 'amount' => $amount]
            )->values())
            ->groupBy('category')
            ->map(fn ($rows) => $rows->sum('amount'));

        return $this->success($totals
            ->map(function (float $total, string $category) {
                $average = round($total / self::RECOMMEND_FROM_MONTHS, 2);

                return ['category' => $category, 'average' => $average, 'suggested' => max(10, (int) ceil($average / 10) * 10)];
            })
            ->sortByDesc('average')
            ->values());
    }
}
