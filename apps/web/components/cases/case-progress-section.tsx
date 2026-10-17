"use client";

import { useEffect, useState } from "react";
import { useSetCaseProgress } from "@/lib/case-queries";
import type { CaseDetail } from "@/lib/types";
import { caseColor, formatDay, isOpen } from "./case-meta";
import { CaseProgressBar } from "./case-progress-bar";
import { ScheduleBadge } from "./case-status-badge";

/** Sends the slider's value once it has rested this long. */
const SAVE_AFTER_MS = 400;

export function CaseProgressSection({ item }: { item: CaseDetail }) {
  const setProgress = useSetCaseProgress(item.id);
  const [draft, setDraft] = useState<number | null>(null);
  const progress = draft ?? item.progress;
  const { analytics } = item;
  const manual = item.progress_mode === "manual" && isOpen(item);
  const { mutate } = setProgress;

  useEffect(() => {
    if (draft === null || draft === item.progress) return;
    const timer = setTimeout(() => mutate(draft, { onSettled: () => setDraft(null) }), SAVE_AFTER_MS);
    return () => clearTimeout(timer);
  }, [draft, item.progress, mutate]);

  return (
    <section aria-labelledby="progress-heading" className="grid gap-5 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 id="progress-heading" className="font-mono text-xs font-semibold tracking-[0.2em] text-muted-foreground">
            PROGRESS
          </h3>
          <p className="mt-1 font-mono text-5xl font-semibold text-primary">{progress}%</p>
        </div>
        <div className="grid justify-items-end gap-1 text-right text-sm">
          <span>
            <span className="font-mono">
              {analytics.missions_completed}/{analytics.missions_total}
            </span>{" "}
            missions complete
          </span>
          <ScheduleBadge schedule={item.schedule} />
        </div>
      </div>

      <CaseProgressBar progress={progress} color={caseColor(item)} large label="Case progress" />

      <p className="text-sm text-muted-foreground">
        {item.status === "completed" && item.actual_end_date
          ? `Closed on ${formatDay(item.actual_end_date)}.`
          : analytics.estimated_completion
            ? `At this rate, done by ${formatDay(analytics.estimated_completion)}.`
            : item.progress_mode === "auto"
              ? "Complete a mission or two and I'll estimate the finish, sir."
              : "Move the slider as work gets done and I'll estimate the finish, sir."}
        {item.target_end_date &&
          item.status !== "completed" &&
          ` Target: ${formatDay(item.target_end_date)}.`}
      </p>

      {manual && (
        <div className="grid gap-2 border-t border-border pt-4">
          <label htmlFor="manual-progress" className="text-sm font-medium">
            Set progress
          </label>
          <input
            id="manual-progress"
            type="range"
            min={0}
            max={100}
            step={5}
            value={progress}
            onChange={(event) => setDraft(Number(event.target.value))}
            aria-valuetext={`${progress} percent`}
            className="h-2 w-full cursor-pointer accent-primary"
          />
          {setProgress.isError && (
            <p role="alert" className="text-xs text-destructive">
              {setProgress.error.message}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
