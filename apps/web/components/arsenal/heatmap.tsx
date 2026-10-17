"use client";

import { cn } from "@gotham/ui/lib/utils";
import { useEffect, useRef, useState } from "react";
import type { Habit, HabitAnalytics, HeatmapState } from "@/lib/types";

type Day = HabitAnalytics["heatmap"][number];

const STATE_LABELS: Record<HeatmapState, string> = {
  completed: "Completed",
  skipped: "Skipped",
  missed: "Missed",
  pending: "Due today",
  off: "Not scheduled",
  none: "Before this habit",
};

const LEGEND: { label: string; className: string }[] = [
  { label: "Completed", className: "bg-emerald-500" },
  { label: "Missed", className: "bg-red-900/70" },
  { label: "Skipped", className: "bg-zinc-500/50" },
  { label: "Not scheduled", className: "bg-white/[0.06]" },
];

const MONTH = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
const FULL_DATE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

/** Dates arrive as Y-m-d; read them as UTC so no timezone shifts the day. */
function parse(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

/** Completed days get brighter the closer a measurable habit came to its target. */
function cellClass(day: Day, habit: Habit): string {
  switch (day.state) {
    case "completed": {
      if (habit.type !== "measurable" || !habit.target_value || day.value === null) return "bg-emerald-500";
      const ratio = day.value / habit.target_value;
      return ratio >= 1 ? "bg-emerald-500" : ratio >= 0.5 ? "bg-emerald-500/60" : "bg-emerald-500/30";
    }
    case "missed":
      return "bg-red-900/70";
    case "skipped":
      return "bg-zinc-500/50";
    case "pending":
      return "bg-white/[0.06] ring-1 ring-primary ring-inset";
    default:
      return "bg-white/[0.06]";
  }
}

function describe(day: Day, habit: Habit): string {
  const value = day.state === "completed" && day.value !== null && habit.unit ? ` (${day.value} ${habit.unit})` : "";
  return `${FULL_DATE.format(parse(day.date))} — ${STATE_LABELS[day.state]}${value}`;
}

/** 52 weeks × 7 days, Sunday at the top, newest week on the right. */
export function Heatmap({ habit, days }: { habit: Habit; days: Day[] }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<{ day: Day; x: number; y: number } | null>(null);

  const weeks: Day[][] = [];
  for (let index = 0; index < days.length; index += 7) {
    weeks.push(days.slice(index, index + 7));
  }

  // On narrow screens, start scrolled to the most recent weeks.
  useEffect(() => {
    const element = scroller.current;
    if (element) element.scrollLeft = element.scrollWidth;
  }, []);

  const completed = days.filter((day) => day.state === "completed").length;

  return (
    <div className="grid gap-3">
      <div ref={scroller} className="relative overflow-x-auto pb-1" onMouseLeave={() => setHovered(null)}>
        <div
          role="img"
          aria-label={`${completed} days completed in the last 52 weeks`}
          className="inline-grid grid-flow-col gap-[3px] pt-5"
          style={{ gridTemplateRows: "repeat(7, 11px)" }}
        >
          {weeks.map((week, column) => {
            // Weeks containing the 1st get the month's name above them.
            const firstOfMonth = week.find((day) => parse(day.date).getUTCDate() === 1);
            return week.map((day, row) => (
              <div
                key={day.date}
                aria-hidden
                className={cn("relative size-[11px] rounded-[2px]", cellClass(day, habit))}
                style={{ gridColumn: column + 1, gridRow: row + 1 }}
                onMouseEnter={(event) => {
                  const cell = event.currentTarget.getBoundingClientRect();
                  const box = scroller.current!.getBoundingClientRect();
                  setHovered({ day, x: cell.left - box.left + scroller.current!.scrollLeft + 5, y: cell.top - box.top });
                }}
              >
                {row === 0 && firstOfMonth && (
                  <span className="absolute -top-5 left-0 font-mono text-[10px] whitespace-nowrap text-muted-foreground">
                    {MONTH.format(parse(firstOfMonth.date))}
                  </span>
                )}
              </div>
            ));
          })}
        </div>

        {hovered && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-border bg-popover px-2 py-1 text-xs whitespace-nowrap shadow-lg"
            style={{ left: hovered.x, top: hovered.y - 4 }}
          >
            {describe(hovered.day, habit)}
          </div>
        )}
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {LEGEND.map((item) => (
          <li key={item.label} className="flex items-center gap-1.5">
            <span className={cn("size-[11px] rounded-[2px]", item.className)} aria-hidden />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
