"use client";

import { buttonVariants } from "@gotham/ui/components/ui/button";
import { BracketCard } from "@gotham/ui/components/bracket-card";
import { cn } from "@gotham/ui/lib/utils";
import { ArrowLeft, Flame, Pencil } from "lucide-react";
import Link from "next/link";
import { SectionCard } from "@/components/section-card";
import { useHabit, useUndoCheckIn } from "@/lib/arsenal-queries";
import type { HabitLog } from "@/lib/types";
import { HabitDetailSkeleton } from "./arsenal-skeletons";
import { CategoryBadge, TypeBadge } from "./habit-badges";
import { CompletionTrend, WeekdayBars } from "./habit-charts";
import { scheduleLabel, streakLabel } from "./habit-meta";
import { HabitNotFound } from "./habit-not-found";
import { Heatmap } from "./heatmap";
import { QuickComplete } from "./quick-complete";

const LOG_DATE = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

function logStatus(log: HabitLog): { label: string; className: string } {
  if (log.completed) return { label: "Completed", className: "text-emerald-400" };
  if (log.skipped) return { label: "Skipped", className: "text-muted-foreground" };
  return { label: "Not done", className: "text-red-400" };
}

function NoHistory() {
  return (
    <p className="flex h-56 items-center justify-center text-center text-sm text-muted-foreground">
      Not enough history yet, sir. Check back in a few days.
    </p>
  );
}

export function HabitDetailView({ id }: { id: number }) {
  const { data, isPending, isError } = useHabit(id);
  const undo = useUndoCheckIn();

  if (isPending) return <HabitDetailSkeleton />;
  if (isError) return <HabitNotFound />;

  const { habit, analytics, recent_logs: logs } = data;
  const short = habit.streak_unit === "weeks" ? "w" : "d";
  const hasHistory = analytics.last_30_days.some((point) => point.rate !== null);

  return (
    <div className="grid gap-6">
      <Link href="/arsenal" className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        Arsenal
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryBadge category={habit.category} />
            <TypeBadge type={habit.type} />
            {!habit.active && <span className="text-xs text-muted-foreground">Archived</span>}
          </div>
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{habit.name}</h2>
          <p className="text-sm text-muted-foreground">
            {scheduleLabel(habit)}
            {habit.reminder_time && ` · Reminder at ${habit.reminder_time}`}
          </p>
          {habit.description && <p className="max-w-2xl text-muted-foreground">{habit.description}</p>}
        </div>
        <Link href={`/arsenal/${habit.id}/edit`} className={buttonVariants({ variant: "outline" })}>
          <Pencil aria-hidden />
          Edit
        </Link>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <BracketCard className="grid content-between gap-2 p-5">
          <p className="font-mono text-xs tracking-[0.2em] text-muted-foreground">CURRENT STREAK</p>
          <p className="flex items-center gap-2 font-mono text-5xl font-semibold">
            <Flame className={cn("size-9", habit.current_streak > 0 ? "text-priority-high" : "text-muted-foreground")} aria-hidden />
            {habit.current_streak}
            <span className="text-base font-normal text-muted-foreground">{habit.streak_unit}</span>
          </p>
        </BracketCard>
        <div className="grid content-between gap-2 rounded-xl border border-border bg-card p-5">
          <p className="font-mono text-xs tracking-[0.2em] text-muted-foreground">BEST STREAK</p>
          <p className="font-mono text-3xl">
            {habit.best_streak}
            <span className="ml-1 text-base text-muted-foreground">{short}</span>
          </p>
        </div>
        <div className="grid content-between gap-2 rounded-xl border border-border bg-card p-5">
          <p className="font-mono text-xs tracking-[0.2em] text-muted-foreground">COMPLETION RATE</p>
          <p className="font-mono text-3xl text-primary">
            {analytics.completion_rate === null ? "–" : `${analytics.completion_rate}%`}
          </p>
          <p className="text-xs text-muted-foreground">
            This month: {habit.month_rate === null ? "–" : `${habit.month_rate}%`}
          </p>
        </div>
      </div>

      {habit.active && (
        <div className="flex flex-wrap items-center gap-3">
          {habit.active_today || habit.completed || habit.skipped ? (
            <QuickComplete habit={habit} size="lg" />
          ) : (
            <p className="text-sm text-muted-foreground">Not due today, sir.</p>
          )}
          {(habit.completed || habit.skipped) && (
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
              disabled={undo.isPending}
              onClick={() => undo.mutate({ id: habit.id })}
            >
              Undo
            </button>
          )}
          {habit.streak_at_risk && (
            <p className="text-sm text-amber-400">
              {streakLabel(habit)} on the line today, sir.
            </p>
          )}
        </div>
      )}

      <SectionCard title="LAST 52 WEEKS">
        <Heatmap habit={habit} days={analytics.heatmap} />
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="COMPLETION · LAST 30 DAYS">
          {hasHistory ? <CompletionTrend points={analytics.last_30_days} /> : <NoHistory />}
        </SectionCard>
        <SectionCard title="SUCCESS BY DAY OF WEEK">
          {hasHistory ? <WeekdayBars days={analytics.by_weekday} /> : <NoHistory />}
        </SectionCard>
      </div>

      <SectionCard title="RECENT LOGS">
        {logs.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Nothing logged yet, sir.</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {logs.map((log) => {
              const status = logStatus(log);
              return (
                <li key={log.id} className="flex items-start justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p>{LOG_DATE.format(new Date(`${log.date}T00:00:00Z`))}</p>
                    {log.note && <p className="truncate text-xs text-muted-foreground">{log.note}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={status.className}>{status.label}</p>
                    {log.value !== null && habit.unit && (
                      <p className="font-mono text-xs text-muted-foreground">
                        {log.value} {habit.unit}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
