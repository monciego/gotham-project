<?php

namespace App\Http\Controllers;

use App\Http\Requests\ResourceRequest;
use App\Http\Resources\ResourceResource;
use App\Models\Resource;
use App\Models\SavingsGoal;
use App\Models\User;
use App\Services\Achievements;
use App\Services\Finance;
use App\Services\RecurringResources;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Income and expense transactions. */
class ResourceController extends Controller
{
    public function __construct(
        private Finance $finance,
        private RecurringResources $recurring,
        private Achievements $achievements,
    ) {}

    /** Newest first by default; `sort=amount` for the largest first. */
    public function index(Request $request): JsonResponse
    {
        $filters = $this->filters($request);
        $page = $this->query($request->user(), $filters)->paginate($filters['per_page'] ?? 20);

        return $this->success([
            'items' => ResourceResource::collection($page->items()),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
            ],
        ]);
    }

    /**
     * Adds any copies a past-dated recurring transaction already owes, checks
     * the budget, and awards trophies (Alfred announces them).
     */
    public function store(ResourceRequest $request): JsonResponse
    {
        $user = $request->user();
        $resource = $user->resources()->create($request->resourceData());

        $this->recurring->generate($resource);
        $this->finance->checkBudget($user, $resource);
        $this->achievements->check($user);

        return $this->success(new ResourceResource($resource), $resource->type === 'income' ? 'Income logged, sir.' : 'Expense logged, sir.', 201);
    }

    public function show(Request $request, int $resource): JsonResponse
    {
        return $this->success(new ResourceResource($request->user()->resources()->findOrFail($resource)));
    }

    public function update(ResourceRequest $request, int $resource): JsonResponse
    {
        $user = $request->user();
        $model = $user->resources()->findOrFail($resource);
        $model->update($request->resourceData());

        $model->savingsGoal?->recalculate();
        $this->recurring->generate($model);
        $this->finance->checkBudget($user, $model);

        return $this->success(new ResourceResource($model), 'Transaction updated.');
    }

    /** Copies of a recurring transaction stay; they're real transactions. */
    public function destroy(Request $request, int $resource): JsonResponse
    {
        $this->delete($request->user(), [$resource]);

        return $this->success(message: 'Transaction deleted.');
    }

    public function bulkDestroy(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ids' => ['required', 'array', 'min:1', 'max:500'],
            'ids.*' => ['integer', 'distinct'],
        ]);

        $deleted = $this->delete($request->user(), $validated['ids']);

        return $this->success(['deleted' => $deleted], "{$deleted} transactions deleted.");
    }

    /**
     * A month's income, expenses, net and spending by category, plus income
     * and expenses for the six months up to it.
     */
    public function summary(Request $request): JsonResponse
    {
        $validated = $request->validate(['month' => ['sometimes', 'date_format:Y-m']]);
        $user = $request->user();
        $month = $this->finance->month($user, $validated['month'] ?? null);

        $totals = fn ($month) => $user->resources()->inMonth($month)
            ->selectRaw('type, sum(amount) as total')
            ->groupBy('type')
            ->pluck('total', 'type')
            ->map(fn ($total) => round((float) $total, 2));

        $current = $totals($month);
        $income = $current->get('income', 0.0);
        $expenses = $current->get('expense', 0.0);

        return $this->success([
            'month' => $month->format('Y-m'),
            'income' => $income,
            'expenses' => $expenses,
            'net' => round($income - $expenses, 2),
            'by_category' => $this->finance->spentByCategory($user, $month)
                ->map(fn (float $amount, string $category) => ['category' => $category, 'amount' => $amount])
                ->values(),
            'history' => collect(range(5, 0))->map(function (int $monthsAgo) use ($month, $totals) {
                $then = $month->subMonthsNoOverflow($monthsAgo);
                $sums = $totals($then);

                return ['month' => $then->format('Y-m'), 'income' => $sums->get('income', 0.0), 'expenses' => $sums->get('expense', 0.0)];
            })->values(),
        ]);
    }

    /** The default categories, then the user's own, for each type. */
    public function categories(Request $request): JsonResponse
    {
        $used = $request->user()->resources()
            ->select('type', 'category')
            ->distinct()
            ->orderBy('category')
            ->get()
            ->groupBy('type');

        return $this->success(collect(Resource::DEFAULT_CATEGORIES)->map(fn (array $defaults, string $type) => collect($defaults)
            ->merge($used->get($type, collect())->pluck('category')->diff($defaults)->sort())
            ->values()
        ));
    }

    /** The filtered transactions as CSV, every page. */
    public function export(Request $request): StreamedResponse
    {
        $query = $this->query($request->user(), $this->filters($request));

        return response()->streamDownload(function () use ($query) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['Date', 'Type', 'Description', 'Category', 'Account', 'Amount']);
            $query->lazy(500)->each(fn (Resource $resource) => fputcsv($out, [
                $resource->date->toDateString(),
                $resource->type,
                $resource->description,
                $resource->category,
                $resource->account,
                // Expenses negative, so the column sums to the net.
                ($resource->type === 'expense' ? '-' : '').$resource->amount,
            ]));
            fclose($out);
        }, 'gotham-resources.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /** @return array<string, mixed> */
    private function filters(Request $request): array
    {
        return $request->validate([
            'type' => ['sometimes', Rule::in(['income', 'expense'])],
            'category' => ['sometimes', 'string', 'max:50'],
            'account' => ['sometimes', 'string', 'max:50'],
            'from' => ['sometimes', 'date_format:Y-m-d'],
            'to' => ['sometimes', 'date_format:Y-m-d'],
            'search' => ['sometimes', 'nullable', 'string', 'max:100'],
            // Only transactions not yet put toward a savings goal.
            'unlinked' => ['sometimes', 'boolean'],
            'sort' => ['sometimes', Rule::in(['date', 'amount'])],
            'direction' => ['sometimes', Rule::in(['asc', 'desc'])],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return HasMany<resource, User>
     */
    private function query(User $user, array $filters): HasMany
    {
        $direction = $filters['direction'] ?? 'desc';

        return $user->resources()
            ->when($filters['type'] ?? null, fn (Builder $query, string $type) => $query->where('type', $type))
            ->when($filters['category'] ?? null, fn (Builder $query, string $category) => $query->where('category', $category))
            ->when($filters['account'] ?? null, fn (Builder $query, string $account) => $query->where('account', $account))
            ->when($filters['from'] ?? null, fn (Builder $query, string $from) => $query->whereDate('date', '>=', $from))
            ->when($filters['to'] ?? null, fn (Builder $query, string $to) => $query->whereDate('date', '<=', $to))
            ->when($filters['search'] ?? null, fn (Builder $query, string $search) => $query->where(
                fn (Builder $query) => $query->whereLike('description', "%{$search}%")->orWhereLike('category', "%{$search}%")
            ))
            ->when($filters['unlinked'] ?? false, fn (Builder $query) => $query->whereNull('savings_goal_id'))
            ->when(
                ($filters['sort'] ?? 'date') === 'amount',
                fn (Builder $query) => $query->orderBy('amount', $direction)->orderByDesc('date'),
                fn (Builder $query) => $query->orderBy('date', $direction),
            )
            ->orderByDesc('id');
    }

    /**
     * Deletes the user's transactions among $ids and recounts the goals they fed.
     *
     * @param  list<int>  $ids
     */
    private function delete(User $user, array $ids): int
    {
        $resources = $user->resources()->whereIn('id', $ids)->get();
        abort_if($resources->isEmpty(), 404);

        return DB::transaction(function () use ($resources) {
            $goalIds = $resources->pluck('savings_goal_id')->filter()->unique();
            $deleted = Resource::whereIn('id', $resources->modelKeys())->delete();
            SavingsGoal::whereIn('id', $goalIds)->get()->each(fn (SavingsGoal $goal) => $goal->recalculate());

            return $deleted;
        });
    }
}
