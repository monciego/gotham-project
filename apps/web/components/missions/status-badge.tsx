import { cn } from "@gotham/ui/lib/utils";
import type { MissionStatus } from "@/lib/types";

export const STATUS_LABELS: Record<MissionStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
  abandoned: "Abandoned",
};

const STYLES: Record<MissionStatus, string> = {
  not_started: "text-muted-foreground",
  in_progress: "text-priority-medium",
  completed: "text-emerald-400",
  abandoned: "text-muted-foreground line-through",
};

const DOTS: Record<MissionStatus, string> = {
  not_started: "bg-muted-foreground",
  in_progress: "bg-priority-medium",
  completed: "bg-emerald-400",
  abandoned: "bg-muted-foreground/50",
};

export function StatusBadge({ status, className }: { status: MissionStatus; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs whitespace-nowrap", STYLES[status], className)}>
      <span aria-hidden className={cn("size-1.5 rounded-full", DOTS[status])} />
      {STATUS_LABELS[status]}
    </span>
  );
}
