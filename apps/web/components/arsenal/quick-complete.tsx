"use client";

import { Button } from "@gotham/ui/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { useCompleteHabit } from "@/lib/arsenal-queries";
import type { Habit } from "@/lib/types";

/** One tap: completes the habit for today (measurable ones log their target). */
export function QuickComplete({ habit, size = "sm" }: { habit: Habit; size?: "sm" | "lg" }) {
  const complete = useCompleteHabit();

  if (habit.completed) {
    return (
      <span className="flex items-center gap-1 text-sm text-emerald-400">
        <Check className="size-4" aria-hidden />
        Completed
      </span>
    );
  }
  if (habit.skipped) {
    return <span className="text-sm text-muted-foreground">Skipped today</span>;
  }

  return (
    <Button
      type="button"
      size={size}
      variant={size === "lg" ? "default" : "outline"}
      disabled={complete.isPending}
      onClick={(event) => {
        // Cards are links; this button shouldn't also follow the link.
        event.preventDefault();
        event.stopPropagation();
        complete.mutate({ id: habit.id });
      }}
    >
      {complete.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <Check aria-hidden />}
      Complete Today
    </Button>
  );
}
