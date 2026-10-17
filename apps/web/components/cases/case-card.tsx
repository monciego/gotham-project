import { CalendarDays, Target } from "lucide-react";
import Link from "next/link";
import type { Case } from "@/lib/types";
import { caseColor, formatDay } from "./case-meta";
import { CaseProgressBar } from "./case-progress-bar";
import { CaseStatusBadge, ScheduleBadge } from "./case-status-badge";

export function CaseCard({ item }: { item: Case }) {
  const color = caseColor(item);

  return (
    <Link
      href={`/cases/${item.id}`}
      className="group grid gap-4 rounded-xl border border-l-4 border-border bg-card p-5 transition-colors duration-200 hover:border-primary/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      style={{ borderLeftColor: color }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold tracking-tight">{item.name}</h3>
          {item.category && (
            <span className="mt-1 inline-block rounded bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">
              {item.category}
            </span>
          )}
        </div>
        <CaseStatusBadge status={item.status} />
      </div>

      <div className="grid gap-2">
        <div className="flex items-baseline justify-between text-sm">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Target className="size-3.5" aria-hidden />
            <span className="font-mono">
              {item.missions_completed}/{item.missions_total}
            </span>
            missions
          </span>
          <span className="font-mono text-base font-semibold">{item.progress}%</span>
        </div>
        <CaseProgressBar progress={item.progress} color={color} label={`${item.name} progress`} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <CalendarDays className="size-3.5" aria-hidden />
          {item.status === "completed" && item.actual_end_date
            ? `Closed ${formatDay(item.actual_end_date)}`
            : item.target_end_date
              ? `Target ${formatDay(item.target_end_date)}`
              : "No target date"}
        </span>
        <ScheduleBadge schedule={item.schedule} />
      </div>
    </Link>
  );
}
