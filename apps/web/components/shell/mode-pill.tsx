import { cn } from "@gotham/ui/lib/utils";
import { MODES } from "@/lib/modes";
import type { User } from "@/lib/types";

export function ModePill({ mode, className }: { mode: User["current_mode"]; className?: string }) {
  const { label, color } = MODES[mode];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-xs",
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label} mode
    </span>
  );
}
