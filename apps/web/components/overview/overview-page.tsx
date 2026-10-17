"use client";

import { Button } from "@gotham/ui/components/ui/button";
import { Input } from "@gotham/ui/components/ui/input";
import { Skeleton } from "@gotham/ui/components/ui/skeleton";
import { cn } from "@gotham/ui/lib/utils";
import { type FormEvent, useState } from "react";
import { SectionCard } from "@/components/section-card";
import { say } from "@/lib/alfred";
import { todayIso } from "@/lib/format";
import { type OverviewParams, useOverview } from "@/lib/overview-queries";
import type { OverviewPeriodName } from "@/lib/types";
import { shortDate } from "./chart-theme";
import { HabitHeatmap } from "./habit-heatmap";
import { InsightsSection } from "./insights-section";
import { KeyMetrics } from "./key-metrics";
import { FocusChart, MissionsChart, MoodEnergyChart } from "./overview-charts";
import { WeeklyReportCard } from "./weekly-report";

const PERIODS: { value: OverviewPeriodName; label: string }[] = [
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "quarter", label: "This Quarter" },
  { value: "year", label: "This Year" },
  { value: "custom", label: "Custom" },
];

/** The API accepts a year at most. */
const MAX_DAYS = 366;

function daysBetween(start: string, end: string): number {
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000) + 1;
}

/** The custom range starts as the last 30 days. */
function thirtyDaysAgo(): string {
  const day = new Date();
  day.setDate(day.getDate() - 29);
  return day.toLocaleDateString("en-CA");
}

function OverviewSkeleton() {
  return (
    <div className="grid gap-6" aria-busy="true" aria-label="Loading overview">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}

export function OverviewPage() {
  const [period, setPeriod] = useState<OverviewPeriodName>("month");
  const [range, setRange] = useState({ start: thirtyDaysAgo(), end: todayIso() });
  // The custom range only applies once submitted, so typing a date doesn't refetch.
  const [applied, setApplied] = useState(range);
  const params: OverviewParams = period === "custom" ? { period, ...applied } : { period };
  const { data, isPending, isError, isFetching, refetch } = useOverview(params);

  const rangeDays = range.start && range.end ? daysBetween(range.start, range.end) : 0;
  const rangeError =
    rangeDays < 1 ? "The end can't come before the start, sir." : rangeDays > MAX_DAYS ? "A year at most, sir." : null;

  function applyRange(event: FormEvent) {
    event.preventDefault();
    if (!rangeError) setApplied(range);
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Overview</h2>
          {data && (
            <p className="mt-1 text-sm text-muted-foreground">
              {shortDate(data.period.start)} – {shortDate(data.period.end)}
            </p>
          )}
        </div>
      </div>

      <div role="tablist" aria-label="Period" className="flex flex-wrap gap-1 border-b border-border">
        {PERIODS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={period === value}
            onClick={() => setPeriod(value)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm transition-colors duration-200",
              period === value
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {period === "custom" && (
        <form onSubmit={applyRange} className="flex flex-wrap items-end gap-3" aria-label="Custom range">
          <label className="grid gap-1.5 text-sm">
            From
            <Input type="date" value={range.start} max={range.end} onChange={(event) => setRange({ ...range, start: event.target.value })} />
          </label>
          <label className="grid gap-1.5 text-sm">
            To
            <Input type="date" value={range.end} min={range.start} onChange={(event) => setRange({ ...range, end: event.target.value })} />
          </label>
          <Button type="submit" disabled={!!rangeError}>
            Apply
          </Button>
          {rangeError && <p className="w-full text-xs text-destructive">{rangeError}</p>}
        </form>
      )}

      {isPending ? (
        <OverviewSkeleton />
      ) : isError ? (
        <div className="grid justify-items-center gap-3 rounded-xl border border-border p-10 text-center">
          <p className="text-muted-foreground">{say("overviewError", 0)}</p>
          <button type="button" className="text-sm text-primary hover:underline" onClick={() => refetch()}>
            Try again
          </button>
        </div>
      ) : (
        // Dimmed while another period loads over the previous one.
        <div className={cn("grid gap-6 transition-opacity duration-200", isFetching && "opacity-60")}>
          <KeyMetrics metrics={data.key_metrics} days={data.period.days} />

          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard title="FOCUS TIME PER DAY">
              <FocusChart days={data.focus_by_day} />
            </SectionCard>
            <SectionCard title="MISSIONS COMPLETED PER WEEK">
              <MissionsChart weeks={data.missions_by_week} />
            </SectionCard>
          </div>

          <SectionCard title="ARSENAL COMPLETION">
            <HabitHeatmap days={data.habit_heatmap} />
          </SectionCard>

          <SectionCard title="MOOD & ENERGY">
            <MoodEnergyChart mood={data.mood_trend} energy={data.energy_trend} />
          </SectionCard>
        </div>
      )}

      <InsightsSection />
      <WeeklyReportCard />
    </div>
  );
}
