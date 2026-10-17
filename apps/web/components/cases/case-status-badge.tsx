import { cn } from "@gotham/ui/lib/utils";
import type { CaseStatus } from "@/lib/types";
import { STATUS_LABELS } from "./case-meta";

const STYLES: Record<CaseStatus, string> = {
  planning: "border-border text-muted-foreground",
  active: "border-priority-medium/40 bg-priority-medium/10 text-blue-300",
  on_hold: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  completed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  archived: "border-border text-muted-foreground/70",
};

export function CaseStatusBadge({ status, className }: { status: CaseStatus; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs whitespace-nowrap", STYLES[status], className)}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

/** "On track" or "Behind schedule" for open cases with a target date. */
export function ScheduleBadge({ schedule }: { schedule: "on_track" | "behind" | null }) {
  if (!schedule) return null;

  return (
    <span className={cn("text-xs", schedule === "on_track" ? "text-emerald-400" : "text-priority-high")}>
      {schedule === "on_track" ? "On track" : "Behind schedule"}
    </span>
  );
}
