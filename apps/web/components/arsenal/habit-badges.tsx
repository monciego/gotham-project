import { cn } from "@gotham/ui/lib/utils";
import { Flame } from "lucide-react";
import type { Habit } from "@/lib/types";
import { TYPE_LABELS, categoryLabel, streakLabel } from "./habit-meta";

export function CategoryBadge({ category }: { category: string }) {
  return (
    <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
      {categoryLabel(category)}
    </span>
  );
}

export function TypeBadge({ type }: { type: Habit["type"] }) {
  return <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[11px]">{TYPE_LABELS[type]}</span>;
}

/** 🔥 and the current streak. Grey until the streak starts. */
export function StreakCount({ habit, className }: { habit: Habit; className?: string }) {
  const lit = habit.current_streak > 0;

  return (
    <span
      className={cn("flex items-center gap-1 font-mono text-sm", lit ? "text-foreground" : "text-muted-foreground", className)}
      aria-label={`${streakLabel(habit)} streak`}
    >
      <Flame className={cn("size-4", lit && "text-priority-high")} aria-hidden />
      {streakLabel(habit)}
    </span>
  );
}
