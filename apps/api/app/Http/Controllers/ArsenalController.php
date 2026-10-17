<?php

namespace App\Http\Controllers;

use App\Http\Requests\ArsenalRequest;
use App\Http\Resources\ArsenalLogResource;
use App\Models\Arsenal;
use App\Models\User;
use App\Services\ArsenalAnalytics;
use App\Services\ArsenalStreaks;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

/** The user's habits. Checking them off lives in ArsenalCheckInController. */
class ArsenalController extends Controller
{
    public function __construct(
        private ArsenalStreaks $streaks,
        private ArsenalAnalytics $analytics,
    ) {}

    /** Every habit, active and archived, with today's state. */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        return $this->success($this->present($user, $user->arsenal()->orderBy('created_at')->orderBy('id')->get()));
    }

    /** The habits due today in the user's current mode, by their frequency. */
    public function today(Request $request): JsonResponse
    {
        $user = $request->user();
        $habits = $this->present($user, $user->arsenal()->active()->orderBy('created_at')->orderBy('id')->get());

        return $this->success($habits->where('active_today', true)->values());
    }

    public function store(ArsenalRequest $request): JsonResponse
    {
        $user = $request->user();
        $habit = $user->arsenal()->create(['frequency' => [], ...$request->habitData()]);

        return $this->success($this->presentOne($user, $habit), 'Added to the Arsenal, sir.', 201);
    }

    /** The habit with its analytics and last 30 check-ins. */
    public function show(Request $request, int $arsenal): JsonResponse
    {
        $user = $request->user();
        $habit = $user->arsenal()->findOrFail($arsenal);

        return $this->success([
            'habit' => $this->presentOne($user, $habit),
            'analytics' => $this->analytics->for($habit, $user),
            'recent_logs' => ArsenalLogResource::collection($habit->logs()->latest('date')->limit(30)->get()),
        ]);
    }

    public function update(ArsenalRequest $request, int $arsenal): JsonResponse
    {
        $user = $request->user();
        $habit = $user->arsenal()->findOrFail($arsenal);
        $habit->update($request->habitData());

        // The schedule may have changed which days count.
        $this->streaks->refresh($habit, $user);

        return $this->success($this->presentOne($user, $habit), 'Habit updated.');
    }

    public function destroy(Request $request, int $arsenal): JsonResponse
    {
        $request->user()->arsenal()->findOrFail($arsenal)->delete();

        return $this->success(message: 'Removed from the Arsenal.');
    }

    /** One month's check-ins. `month` is Y-m and defaults to the user's current month. */
    public function logs(Request $request, int $arsenal): JsonResponse
    {
        $validated = $request->validate(['month' => ['sometimes', 'date_format:Y-m']]);

        $user = $request->user();
        $habit = $user->arsenal()->findOrFail($arsenal);
        $month = isset($validated['month'])
            ? CarbonImmutable::createFromFormat('!Y-m', $validated['month'])
            : $user->today()->startOfMonth();

        $logs = $habit->logs()
            ->whereDate('date', '>=', $month)
            ->whereDate('date', '<=', $month->endOfMonth())
            ->orderBy('date')
            ->get();

        return $this->success(ArsenalLogResource::collection($logs));
    }

    /**
     * @param  Collection<int, Arsenal>  $habits
     * @return Collection<int, array<string, mixed>>
     */
    private function present(User $user, Collection $habits): Collection
    {
        $logs = $this->streaks->logsFor($habits, $user->today());

        return $habits->map(fn (Arsenal $habit) => $this->streaks->present($habit, $logs->get($habit->id, collect()), $user));
    }

    /** @return array<string, mixed> */
    private function presentOne(User $user, Arsenal $habit): array
    {
        return $this->present($user, collect([$habit]))->first();
    }
}
