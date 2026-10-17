"use client";

import { cn } from "@gotham/ui/lib/utils";
import { Check, Flame } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { say } from "@/lib/alfred";
import { useToggleHabit } from "@/lib/queries";
import type { HabitToday } from "@/lib/types";

type HabitCheckProps = {
  habit: HabitToday;
  onMilestone: (milestone: number, habit: HabitToday) => void;
};

function detail(habit: HabitToday): string | null {
  if (habit.week_progress) {
    return `${habit.week_progress.done}/${habit.week_progress.target} this week`;
  }
  if (habit.type === "measurable" && habit.target_value) {
    return [habit.target_value, habit.unit].filter(Boolean).join(" ");
  }
  return null;
}

/** One tap anywhere on the row checks the habit off, or undoes it. */
export function HabitCheck({ habit, onMilestone }: HabitCheckProps) {
  const toggle = useToggleHabit();
  const info = detail(habit);

  function handleToggle() {
    toggle.mutate(
      { id: habit.id, completed: !habit.completed },
      { onSuccess: ({ milestone }) => milestone && onMilestone(milestone, habit) },
    );
  }

  return (
    <div>
      <button
        type="button"
        role="checkbox"
        aria-checked={habit.completed}
        onClick={handleToggle}
        className="group flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors duration-200 hover:bg-accent/60"
      >
        <span
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded border transition-colors duration-200",
            habit.completed
              ? "border-primary bg-primary text-primary-foreground"
              : "border-muted-foreground/50 group-hover:border-primary",
          )}
        >
          <AnimatePresence initial={false}>
            {habit.completed && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Check className="size-3.5" strokeWidth={3} aria-hidden />
              </motion.span>
            )}
          </AnimatePresence>
        </span>

        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block truncate text-sm transition-colors duration-200",
              habit.completed && "text-muted-foreground line-through",
            )}
          >
            {habit.name}
          </span>
          {info && <span className="block text-xs text-muted-foreground">{info}</span>}
        </span>

        <span
          className="flex items-center gap-1 font-mono text-xs text-muted-foreground"
          aria-label={`${habit.current_streak} ${habit.streak_unit} streak`}
        >
          <Flame
            className={cn("size-3.5", habit.current_streak > 0 && "text-priority-high")}
            aria-hidden
          />
          {/* The new number slides in when the streak changes. */}
          <span className="relative inline-flex overflow-hidden">
            <AnimatePresence initial={false} mode="popLayout">
              <motion.span
                key={habit.current_streak}
                initial={{ y: -10, opacity: 0, color: "#d4af37" }}
                animate={{ y: 0, opacity: 1, color: "#9a9aa0" }}
                exit={{ y: 10, opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                {habit.current_streak}
              </motion.span>
            </AnimatePresence>
          </span>
          {habit.streak_unit === "weeks" ? "w" : "d"}
        </span>
      </button>

      {toggle.isError && (
        <p role="alert" className="px-2 pb-1 text-xs text-destructive">
          {say("habitSaveFailed", 0)}
        </p>
      )}
    </div>
  );
}
