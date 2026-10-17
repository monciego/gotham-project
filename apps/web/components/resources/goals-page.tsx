"use client";

import { Button } from "@gotham/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@gotham/ui/components/ui/dialog";
import { Skeleton } from "@gotham/ui/components/ui/skeleton";
import { cn } from "@gotham/ui/lib/utils";
import { ChevronDown, PiggyBank, Pencil, Plus, Trash2, Trophy } from "lucide-react";
import { useState } from "react";
import { formatDay, formatMoney } from "@/lib/money";
import { useDeleteGoal, useSavingsGoals } from "@/lib/resource-queries";
import type { SavingsGoal } from "@/lib/types";
import { ContributeDialog } from "./contribute-dialog";
import { GoalDialog } from "./goal-dialog";

function deadlineText(goal: SavingsGoal): string | null {
  if (goal.days_left === null) return null;
  if (goal.days_left > 1) return `${goal.days_left} days left`;
  if (goal.days_left === 1) return "1 day left";
  if (goal.days_left === 0) return "Due today";
  return `${-goal.days_left} days overdue`;
}

function GoalCard({ goal }: { goal: SavingsGoal }) {
  const [dialog, setDialog] = useState<"contribute" | "edit" | "delete" | null>(null);
  const remove = useDeleteGoal(goal.id);
  const close = (open: boolean) => !open && setDialog(null);
  const deadline = deadlineText(goal);

  return (
    <article className="grid gap-4 rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-medium">{goal.name}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {goal.completed && goal.completed_at
              ? `Reached ${formatDay(goal.completed_at.slice(0, 10))}`
              : [deadline, goal.deadline && `by ${formatDay(goal.deadline)}`].filter(Boolean).join(" · ") || "No deadline"}
          </p>
        </div>
        {!goal.completed && goal.on_track !== null && (
          <span
            className={cn(
              "shrink-0 rounded-full border px-2 py-0.5 text-xs",
              goal.on_track ? "border-emerald-500/40 text-emerald-400" : "border-amber-500/40 text-amber-400",
            )}
            title={goal.expected_amount !== null ? `${formatMoney(goal.expected_amount)} expected by today` : undefined}
          >
            {goal.on_track ? "On track" : "Behind"}
          </span>
        )}
      </div>

      <div className="grid gap-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-mono text-lg">
            {formatMoney(goal.current_amount)} <span className="text-sm text-muted-foreground">/ {formatMoney(goal.target_amount)}</span>
          </p>
          <span className="font-mono text-sm text-primary">{goal.percentage}%</span>
        </div>
        <div
          className="h-2.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label={`${goal.name} saved`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={goal.percentage}
        >
          <div
            className={cn("h-full rounded-full transition-[width] duration-300", goal.completed ? "bg-emerald-500" : "bg-primary")}
            style={{ width: `${goal.percentage}%` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {!goal.completed && (
          <Button size="sm" onClick={() => setDialog("contribute")}>
            <PiggyBank aria-hidden />
            Contribute
          </Button>
        )}
        <Button variant="ghost" size="icon-sm" aria-label={`Edit ${goal.name}`} onClick={() => setDialog("edit")}>
          <Pencil aria-hidden />
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label={`Delete ${goal.name}`} onClick={() => setDialog("delete")}>
          <Trash2 aria-hidden />
        </Button>
      </div>

      <ContributeDialog goal={goal} open={dialog === "contribute"} onOpenChange={close} />
      <GoalDialog goal={goal} open={dialog === "edit"} onOpenChange={close} />
      <Dialog open={dialog === "delete"} onOpenChange={close}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{goal.name}&rdquo;?</DialogTitle>
            <DialogDescription>Its transactions stay in Resources; they just stop counting toward a goal.</DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton>
            <Button variant="destructive" disabled={remove.isPending} onClick={() => remove.mutate(undefined, { onSuccess: () => setDialog(null) })}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}

export function GoalsPage() {
  const { data, isPending } = useSavingsGoals();
  const [creating, setCreating] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-mono text-xs font-semibold tracking-[0.2em] text-muted-foreground">SAVINGS GOALS</h3>
        <Button variant="outline" onClick={() => setCreating(true)}>
          <Plus aria-hidden />
          Create goal
        </Button>
      </div>

      {isPending || !data ? (
        <div className="grid gap-3 md:grid-cols-2" aria-busy>
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-44 rounded-xl" />
        </div>
      ) : data.active.length === 0 ? (
        <div className="grid justify-items-center gap-4 rounded-xl border border-dashed border-border px-6 py-14 text-center">
          <PiggyBank className="size-8 text-primary" aria-hidden />
          <p className="max-w-sm text-muted-foreground">No goals in progress, sir. Even the Batcave was saved up for.</p>
          <Button onClick={() => setCreating(true)}>
            <Plus aria-hidden />
            Create goal
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {data.active.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}

      {data && data.completed.length > 0 && (
        <section className="grid gap-3">
          <button
            type="button"
            aria-expanded={showCompleted}
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <Trophy className="size-4 text-primary" aria-hidden />
            Completed · {data.completed.length}
            <ChevronDown className={cn("size-4 transition-transform duration-200", showCompleted && "rotate-180")} aria-hidden />
          </button>
          {showCompleted && (
            <div className="grid gap-3 md:grid-cols-2">
              {data.completed.map((goal) => (
                <GoalCard key={goal.id} goal={goal} />
              ))}
            </div>
          )}
        </section>
      )}

      <GoalDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}
