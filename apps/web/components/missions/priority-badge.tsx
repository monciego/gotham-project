import { cn } from "@gotham/ui/lib/utils";
import type { Priority } from "@/lib/types";

const STYLES: Record<Priority, string> = {
  critical: "border-priority-critical/40 bg-priority-critical/10 text-priority-critical",
  high: "border-priority-high/40 bg-priority-high/10 text-priority-high",
  medium: "border-priority-medium/40 bg-priority-medium/10 text-priority-medium",
  low: "border-priority-low/40 bg-priority-low/10 text-priority-low",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider uppercase",
        STYLES[priority],
      )}
    >
      {priority}
    </span>
  );
}
