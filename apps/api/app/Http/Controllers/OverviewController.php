<?php

namespace App\Http\Controllers;

use App\Models\WeeklyReport;
use App\Services\Overview;
use App\Services\ReportService;
use App\Support\Period;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class OverviewController extends Controller
{
    /**
     * `period`: week, month, quarter or year (from its start to today), or
     * custom with `start` and `end` (Y-m-d, at most 366 days). Defaults to month.
     */
    public function index(Request $request, Overview $overview): JsonResponse
    {
        $validated = $request->validate([
            'period' => ['sometimes', Rule::in(Period::NAMES)],
            'start' => ['required_if:period,custom', 'nullable', 'date_format:Y-m-d'],
            'end' => ['required_if:period,custom', 'nullable', 'date_format:Y-m-d', 'after_or_equal:start'],
        ]);

        $user = $request->user();
        $name = $validated['period'] ?? 'month';
        $period = $name === 'custom'
            ? Period::custom($validated['start'], $validated['end'], $user->timezone)
            : Period::named($name, $user->today());

        if ($period->days() > Period::MAX_DAYS) {
            throw ValidationException::withMessages(['end' => 'A year at most, sir. Try a shorter range.']);
        }

        return $this->success($overview->for($user, $period));
    }

    /**
     * The weekly report, built now: this week so far, or the week containing
     * `week` (Y-m-d). `period` is only `week` for now.
     */
    public function report(Request $request, ReportService $reports): JsonResponse
    {
        $validated = $request->validate([
            'period' => ['sometimes', Rule::in(['week'])],
            'week' => ['sometimes', 'date_format:Y-m-d'],
        ]);
        $user = $request->user();
        $day = isset($validated['week']) ? CarbonImmutable::parse($validated['week'], $user->timezone) : null;

        return $this->success($reports->generateWeeklyReport($user, $day));
    }

    /** Reports saved each Sunday night, newest first (the last 26 weeks). */
    public function reports(Request $request): JsonResponse
    {
        $saved = $request->user()->weeklyReports()->latest('week_start')->limit(26)->get();

        return $this->success($saved->map(fn (WeeklyReport $report) => $report->report)->values());
    }
}
