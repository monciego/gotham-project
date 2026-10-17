"use client";

import { Button } from "@gotham/ui/components/ui/button";
import { Input } from "@gotham/ui/components/ui/input";
import { cn } from "@gotham/ui/lib/utils";
import { Check, Minus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { useCompleteHabit, useUndoCheckIn } from "@/lib/arsenal-queries";
import type { Habit } from "@/lib/types";
import { CategoryBadge, StreakCount } from "./habit-badges";
import { SkipDialog } from "./skip-dialog";

/** One habit on the daily check-in: a big tap target, or a value field for measurable habits. */
export function CheckInRow({ habit }: { habit: Habit }) {
  const complete = useCompleteHabit();
  const undo = useUndoCheckIn();
  const [skipping, setSkipping] = useState(false);
  const [value, setValue] = useState("");
  const done = habit.completed || habit.skipped;
  const measurable = habit.type === "measurable" && !done;
  const error = complete.error ?? undo.error;

  function toggle() {
    if (done) {
      undo.mutate({ id: habit.id });
    } else {
      complete.mutate({ id: habit.id });
    }
  }

  function logValue(event: React.FormEvent) {
    event.preventDefault();
    complete.mutate({ id: habit.id, value: value === "" ? null : Number(value) });
  }

  return (
    <li
      className={cn(
        "rounded-xl border bg-card transition-colors duration-200",
        habit.completed ? "border-emerald-500/40" : "border-border",
        habit.skipped && "opacity-60",
      )}
    >
      <div className="flex items-center gap-4 p-4">
        {measurable ? (
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/40 font-mono text-xs text-muted-foreground">
            {habit.target_value}
          </span>
        ) : (
          <button
            type="button"
            role="checkbox"
            aria-checked={habit.completed ? true : habit.skipped ? "mixed" : false}
            aria-label={done ? `Undo ${habit.name}` : `Complete ${habit.name}`}
            onClick={toggle}
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-xl border-2 transition-colors duration-200",
              habit.completed
                ? "border-emerald-500 bg-emerald-500 text-black"
                : habit.skipped
                  ? "border-muted-foreground/40 bg-muted text-muted-foreground"
                  : "border-muted-foreground/50 hover:border-primary",
            )}
          >
            <AnimatePresence initial={false}>
              {done && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ duration: 0.2 }}>
                  {habit.completed ? <Check className="size-6" strokeWidth={3} aria-hidden /> : <Minus className="size-6" aria-hidden />}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        )}

        <div className="min-w-0 flex-1">
          <Link
            href={`/arsenal/${habit.id}`}
            className={cn(
              "block truncate text-base font-medium transition-colors duration-200 hover:text-primary",
              done && "text-muted-foreground line-through",
            )}
          >
            {habit.name}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <CategoryBadge category={habit.category} />
            <StreakCount habit={habit} className="text-xs" />
            {habit.week_progress && (
              <span className="font-mono text-xs text-muted-foreground">
                {habit.week_progress.done}/{habit.week_progress.target} this week
              </span>
            )}
            {habit.completed && (
              <span className="text-xs text-emerald-400">
                Completed{habit.type === "measurable" && habit.value !== null && ` · ${habit.value} ${habit.unit ?? ""}`}
              </span>
            )}
            {habit.skipped && <span className="text-xs text-muted-foreground">Skipped</span>}
          </div>
        </div>

        {!done && (
          <button
            type="button"
            className="shrink-0 text-xs text-muted-foreground hover:text-foreground hover:underline"
            onClick={() => setSkipping(true)}
          >
            Skip
          </button>
        )}
      </div>

      {measurable && (
        <form onSubmit={logValue} className="flex items-center gap-2 border-t border-border px-4 py-3">
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={String(habit.target_value ?? "")}
            aria-label={`${habit.name}, in ${habit.unit ?? "units"}`}
            className="w-28"
          />
          <span className="text-sm text-muted-foreground">
            / {habit.target_value} {habit.unit}
          </span>
          <Button type="submit" size="sm" className="ml-auto" disabled={complete.isPending}>
            Log
          </Button>
        </form>
      )}

      {error && (
        <p role="alert" className="px-4 pb-3 text-xs text-destructive">
          {error.message}
        </p>
      )}

      <SkipDialog habit={habit} open={skipping} onOpenChange={setSkipping} />
    </li>
  );
}
