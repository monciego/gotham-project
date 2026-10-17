"use client";

import { Button } from "@gotham/ui/components/ui/button";
import { Input } from "@gotham/ui/components/ui/input";
import { cn } from "@gotham/ui/lib/utils";
import { Flag, Plus, X } from "lucide-react";
import { type FormEvent, useState } from "react";
import { say } from "@/lib/alfred";
import { useAddMilestone, useDeleteMilestone, useUpdateMilestone } from "@/lib/case-queries";
import { todayIso } from "@/lib/format";
import type { CaseMilestone } from "@/lib/types";
import { formatDay } from "./case-meta";

export function MilestonesSection({ caseId, milestones }: { caseId: number; milestones: CaseMilestone[] }) {
  const add = useAddMilestone(caseId);
  const update = useUpdateMilestone(caseId);
  const remove = useDeleteMilestone(caseId);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState(todayIso());
  const done = milestones.filter((milestone) => milestone.completed).length;
  const error = add.error ?? update.error ?? remove.error;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !date) return;
    add.mutate({ name: name.trim(), target_date: date });
    setName("");
  }

  return (
    <section aria-labelledby="milestones-heading" className="grid content-start gap-4 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 id="milestones-heading" className="font-mono text-xs font-semibold tracking-[0.2em] text-muted-foreground">
          MILESTONES
          {milestones.length > 0 && (
            <span className="ml-2">
              {done}/{milestones.length}
            </span>
          )}
        </h3>
        {!adding && (
          <Button variant="ghost" size="sm" onClick={() => setAdding(true)}>
            <Plus aria-hidden />
            Add Milestone
          </Button>
        )}
      </div>

      {milestones.length > 0 && (
        <div
          role="progressbar"
          aria-label="Milestones reached"
          aria-valuenow={done}
          aria-valuemin={0}
          aria-valuemax={milestones.length}
          className="flex gap-1"
        >
          {milestones.map((milestone) => (
            <span
              key={milestone.id}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors duration-300",
                milestone.completed ? "bg-primary" : "bg-secondary",
              )}
            />
          ))}
        </div>
      )}

      {milestones.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground">{say("caseMilestonesEmpty", 0)}</p>
      )}

      <ul className="grid gap-1">
        {milestones.map((milestone) => (
          <li key={milestone.id} className="group flex items-center gap-3 rounded-lg px-1 py-1.5">
            <input
              type="checkbox"
              id={`milestone-${milestone.id}`}
              checked={milestone.completed}
              disabled={milestone.id < 0}
              onChange={(event) => update.mutate({ id: milestone.id, completed: event.target.checked })}
              className="size-4 shrink-0 cursor-pointer accent-primary"
            />
            <label htmlFor={`milestone-${milestone.id}`} className="min-w-0 flex-1 cursor-pointer">
              <span className={cn("block truncate text-sm", milestone.completed && "text-muted-foreground line-through")}>
                {milestone.name}
              </span>
              <span
                className={cn(
                  "flex items-center gap-1 text-xs text-muted-foreground",
                  milestone.is_overdue && "text-priority-critical",
                )}
              >
                <Flag className="size-3" aria-hidden />
                {milestone.is_overdue && "Overdue · "}
                {formatDay(milestone.target_date)}
              </span>
            </label>
            <button
              type="button"
              aria-label={`Remove ${milestone.name}`}
              disabled={milestone.id < 0}
              onClick={() => remove.mutate(milestone.id)}
              className="rounded p-1 text-muted-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100"
            >
              <X className="size-4" aria-hidden />
            </button>
          </li>
        ))}
      </ul>

      {adding && (
        <form onSubmit={submit} className="grid gap-2 border-t border-border pt-4">
          <Input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Find the informant"
            aria-label="Milestone name"
            maxLength={100}
          />
          <div className="flex gap-2">
            <Input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              aria-label="Target date"
              className="flex-1"
            />
            <Button type="submit" disabled={!name.trim() || !date}>
              Add
            </Button>
            <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
              Done
            </Button>
          </div>
        </form>
      )}

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error.message}
        </p>
      )}
    </section>
  );
}
