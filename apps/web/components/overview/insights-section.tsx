"use client";

import { Button } from "@gotham/ui/components/ui/button";
import { Skeleton } from "@gotham/ui/components/ui/skeleton";
import { cn } from "@gotham/ui/lib/utils";
import { Lightbulb, Loader2, RefreshCw } from "lucide-react";
import { say } from "@/lib/alfred";
import { formatDateTime } from "@/lib/format";
import { useInsights, useRefreshInsights } from "@/lib/overview-queries";
import type { InsightCategory } from "@/lib/types";

const CATEGORIES: Record<InsightCategory, { label: string; className: string }> = {
  habit: { label: "Habit", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" },
  mission: { label: "Mission", className: "border-primary/40 bg-primary/10 text-primary" },
  energy: { label: "Energy", className: "border-priority-medium/40 bg-priority-medium/10 text-blue-300" },
  pattern: { label: "Pattern", className: "border-violet-500/30 bg-violet-500/10 text-violet-300" },
  finance: { label: "Finance", className: "border-teal-500/30 bg-teal-500/10 text-teal-300" },
};

export function InsightsSection() {
  const { data, isPending, isError, refetch } = useInsights();
  const refresh = useRefreshInsights();

  return (
    <section aria-labelledby="insights-heading" className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 id="insights-heading" className="font-mono text-xs font-semibold tracking-[0.2em] text-muted-foreground">
            ALFRED&apos;S INSIGHTS
          </h3>
          {data && (
            <p className="mt-1 text-xs text-muted-foreground">
              From the last {data.days} days · {formatDateTime(data.generated_at)}
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" disabled={refresh.isPending} onClick={() => refresh.mutate()}>
          {refresh.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <RefreshCw aria-hidden />}
          Refresh Insights
        </Button>
      </div>

      {refresh.isError && (
        <p role="alert" className="text-xs text-destructive">
          {refresh.error.message}
        </p>
      )}

      {isPending ? (
        <div className="grid gap-3 md:grid-cols-2" aria-busy="true" aria-label="Loading insights">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <div className="grid justify-items-center gap-3 rounded-xl border border-border p-8 text-center">
          <p className="text-muted-foreground">{say("error", 0)}</p>
          <button type="button" className="text-sm text-primary hover:underline" onClick={() => refetch()}>
            Try again
          </button>
        </div>
      ) : data.insights.length === 0 ? (
        <div className="grid justify-items-center gap-3 rounded-xl border border-dashed border-border px-6 py-10 text-center">
          <Lightbulb className="size-7 text-primary" aria-hidden />
          <p className="max-w-sm">{say("insightsEmpty", 0)}</p>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {data.insights.map((insight) => (
            <li key={insight.key} className="flex gap-3 rounded-xl border border-border bg-card p-4">
              <Lightbulb className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
              <div className="grid gap-2">
                <p className="leading-relaxed">{insight.text}</p>
                <span
                  className={cn(
                    "w-fit rounded-full border px-2 py-0.5 text-[11px]",
                    CATEGORIES[insight.category].className,
                  )}
                >
                  {CATEGORIES[insight.category].label}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
