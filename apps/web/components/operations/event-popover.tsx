"use client";

import { Button } from "@gotham/ui/components/ui/button";
import { Pencil, Repeat, Target, Trash2, X, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useDeleteOperation } from "@/lib/operation-queries";
import type { CalendarEntry } from "@/lib/types";
import { CATEGORY_LABELS, FREQUENCY_LABELS, entryColor, entryWhen } from "./operation-meta";

const WIDTH = 288;

type EventPopoverProps = {
  entry: CalendarEntry;
  /** Where the click happened, in viewport pixels. */
  anchor: { x: number; y: number };
  onClose: () => void;
  onEdit: () => void;
};

/** Details for a clicked entry, beside the click. Escape or a click outside closes it. */
export function EventPopover({ entry, anchor, onClose, onEdit }: EventPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const remove = useDeleteOperation();
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    ref.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    const onPointer = (event: PointerEvent) => !ref.current?.contains(event.target as Node) && onClose();
    document.addEventListener("keydown", onKey);
    // Next tick, so the click that opened it doesn't close it.
    const timer = setTimeout(() => document.addEventListener("pointerdown", onPointer));
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [onClose]);

  // Keep it on screen.
  const left = Math.max(8, Math.min(anchor.x - WIDTH / 2, window.innerWidth - WIDTH - 8));
  const top = Math.min(anchor.y + 12, window.innerHeight - 260);
  const focusBlock = entry.kind === "focus_block";

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={entry.title}
      tabIndex={-1}
      className="fixed z-50 grid gap-3 rounded-xl border border-border bg-popover p-4 shadow-2xl outline-none"
      style={{ left, top: Math.max(8, top), width: WIDTH, borderTopColor: entryColor(entry), borderTopWidth: 3 }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-medium break-words">{entry.title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{entryWhen(entry)}</p>
        </div>
        <button type="button" aria-label="Close" onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-accent">
          <X className="size-4" aria-hidden />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full border border-border px-2 py-0.5 text-muted-foreground">
          {entry.kind === "habit" ? "Habit" : focusBlock ? "Focus block" : (CATEGORY_LABELS[entry.category as keyof typeof CATEGORY_LABELS] ?? entry.category)}
        </span>
        {entry.recurring && entry.recurring_rule && (
          <span className="flex items-center gap-1 text-muted-foreground">
            <Repeat className="size-3" aria-hidden />
            {FREQUENCY_LABELS[entry.recurring_rule.freq]}
            {entry.recurring_rule.until && ` until ${entry.recurring_rule.until}`}
          </span>
        )}
      </div>

      {entry.description && <p className="text-sm whitespace-pre-line text-muted-foreground">{entry.description}</p>}

      {entry.mission && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-2.5">
          <p className="text-xs text-muted-foreground">{focusBlock ? "Mission this block is for" : "Linked mission"}</p>
          <Link href={`/missions/${entry.mission.id}`} className="mt-0.5 flex items-center gap-1.5 text-sm text-primary hover:underline">
            <Target className="size-3.5 shrink-0" aria-hidden />
            {entry.mission.title}
          </Link>
        </div>
      )}

      {entry.kind === "habit" ? (
        <Link href={`/arsenal/${entry.habit_id}`} className="flex items-center gap-1.5 text-sm text-emerald-400 hover:underline">
          <Zap className="size-3.5" aria-hidden />
          Open in the Arsenal
        </Link>
      ) : confirming ? (
        <div className="grid gap-2">
          <p className="text-sm">
            Delete {entry.recurring ? "every occurrence of this event" : "this event"}?
          </p>
          {remove.isError && <p className="text-xs text-destructive">{remove.error.message}</p>}
          <div className="flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              disabled={remove.isPending}
              onClick={() => remove.mutate(entry.operation_id!, { onSuccess: onClose })}
            >
              Delete
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
              Keep it
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil aria-hidden />
            Edit
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setConfirming(true)}>
            <Trash2 aria-hidden />
            Delete
          </Button>
        </div>
      )}
    </div>
  );
}
