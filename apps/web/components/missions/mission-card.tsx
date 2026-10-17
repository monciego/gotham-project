import { cn } from "@gotham/ui/lib/utils";
import { AlertTriangle, CalendarDays, ListChecks } from "lucide-react";
import Link from "next/link";
import { formatDueDate } from "@/lib/format";
import type { Mission } from "@/lib/types";
import { PriorityBadge } from "./priority-badge";
import { QuickStartButton } from "@/components/focus/quick-start-button";
import { StatusBadge } from "./status-badge";

type MissionCardProps = {
  mission: Mission;
  /** Kanban cards drop the start button and status (the column says it). */
  compact?: boolean;
  /** Extra controls, such as a drag handle. */
  leading?: React.ReactNode;
};

export function MissionCard({ mission, compact, leading }: MissionCardProps) {
  const open = mission.status === "not_started" || mission.status === "in_progress";

  return (
    <article
      className={cn(
        "group relative flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors duration-200 hover:border-primary/40",
        !open && "opacity-70",
      )}
    >
      {leading}
      {/* The whole card opens the mission; the buttons sit above this link. */}
      <Link
        href={`/missions/${mission.id}`}
        className="absolute inset-0 rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        aria-label={mission.title}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <PriorityBadge priority={mission.priority} />
          <h3 className={cn("truncate font-medium", mission.status === "completed" && "line-through")}>
            {mission.title}
          </h3>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className={cn("flex items-center gap-1", mission.is_overdue && "text-priority-critical")}>
            <CalendarDays className="size-3.5" aria-hidden />
            {mission.is_overdue && "Overdue · "}
            {formatDueDate(mission.due_date)}
            {mission.due_time && ` · ${mission.due_time}`}
          </span>
          {mission.case && <span className="truncate">{mission.case.name}</span>}
          {!!mission.subtasks_count && (
            <span className="flex items-center gap-1 font-mono">
              <ListChecks className="size-3.5" aria-hidden />
              {mission.subtasks_completed_count}/{mission.subtasks_count}
            </span>
          )}
        </div>

        {mission.times_postponed > 0 && (
          <span className="mt-2 inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-xs text-amber-400">
            <AlertTriangle className="size-3" aria-hidden />
            Postponed {mission.times_postponed} {mission.times_postponed === 1 ? "time" : "times"}
          </span>
        )}
      </div>

      {!compact && (
        <div className="relative z-10 flex shrink-0 flex-col items-end gap-2">
          <StatusBadge status={mission.status} />
          {open && <QuickStartButton missionId={mission.id} compactLabel />}
        </div>
      )}
    </article>
  );
}
