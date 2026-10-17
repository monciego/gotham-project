"use client";

import { cn } from "@gotham/ui/lib/utils";
import { ChevronDown } from "lucide-react";
import { MODES } from "@/lib/modes";
import type { Mode } from "@/lib/types";
import { useCommandStore } from "@/stores/command";

/** The current life mode. Clicking it opens the mode switcher. */
export function ModePill({ mode, className }: { mode: Mode; className?: string }) {
  const { label, color } = MODES[mode];
  const show = useCommandStore((state) => state.show);

  return (
    <button
      type="button"
      onClick={() => show("mode")}
      title="Change life mode"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-xs transition-colors duration-200 hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full transition-colors duration-300" style={{ backgroundColor: color }} />
      {label} mode
      <ChevronDown className="size-3 text-muted-foreground" aria-hidden />
    </button>
  );
}
