"use client";

import { cn } from "@gotham/ui/lib/utils";
import { useState } from "react";
import type { Overview } from "@/lib/types";
import { EmptyChart, shortDate } from "./chart-theme";

type Day = Overview["habit_heatmap"][number];

const WEEKDAYS = ["Mon", "", "Wed", "", "Fri", "", "Sun"];

const LEGEND = [
  { label: "None due", className: "bg-white/[0.04]" },
  { label: "0%", className: "bg-white/[0.1]" },
  { label: "", className: "bg-primary/30" },
  { label: "", className: "bg-primary/60" },
  { label: "100%", className: "bg-primary" },
];

/** Dark when little got done, gold as the day's habits fill up. */
function cellClass(rate: number | null): string {
  if (rate === null) return "bg-white/[0.04]";
  if (rate === 0) return "bg-white/[0.1]";
  if (rate < 50) return "bg-primary/30";
  if (rate < 100) return "bg-primary/60";
  return "bg-primary";
}

/** Monday of the day's week, as an offset 0–6. */
function weekdayIndex(date: string): number {
  return (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;
}

/** A GitHub-style grid: one column per week, Monday at the top. */
export function HabitHeatmap({ days }: { days: Overview["habit_heatmap"] }) {
  const [hovered, setHovered] = useState<Day | null>(null);

  if (days.every((day) => day.completion_rate === null)) {
    return <EmptyChart>No habits were due in this period, sir.</EmptyChart>;
  }

  // Blank cells before the first day line it up under its weekday.
  const cells: (Day | null)[] = [...Array.from({ length: weekdayIndex(days[0]!.date) }, () => null), ...days];
  const weeks = Math.ceil(cells.length / 7);
  const size = weeks <= 6 ? 28 : weeks <= 16 ? 16 : 11;
  const rated = days.filter((day) => day.completion_rate !== null);
  const average = Math.round(rated.reduce((sum, day) => sum + day.completion_rate!, 0) / rated.length);

  return (
    <div className="grid gap-3">
      <div className="flex gap-2 overflow-x-auto pb-1" onMouseLeave={() => setHovered(null)}>
        <div className="grid shrink-0 gap-[3px] font-mono text-[10px] text-muted-foreground" style={{ gridTemplateRows: `repeat(7, ${size}px)` }} aria-hidden>
          {WEEKDAYS.map((label, index) => (
            <span key={index} className="flex items-center">
              {label}
            </span>
          ))}
        </div>
        <div
          role="img"
          aria-label={`Habit completion by day, ${average}% on average`}
          className="grid grid-flow-col gap-[3px]"
          style={{ gridTemplateRows: `repeat(7, ${size}px)`, gridAutoColumns: `${size}px` }}
        >
          {cells.map((day, index) =>
            day ? (
              <div
                key={day.date}
                aria-hidden
                onMouseEnter={() => setHovered(day)}
                className={cn("rounded-[3px] transition-colors duration-200", cellClass(day.completion_rate))}
              />
            ) : (
              <div key={`blank-${index}`} aria-hidden />
            ),
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <p aria-live="polite" className="min-h-4">
          {hovered
            ? `${shortDate(hovered.date)} — ${hovered.completion_rate === null ? "nothing due" : `${hovered.completion_rate}% of habits`}`
            : `${average}% on average across ${rated.length} days`}
        </p>
        <ul className="flex items-center gap-1.5">
          {LEGEND.map((item, index) => (
            <li key={index} className="flex items-center gap-1">
              <span className={cn("size-[11px] rounded-[2px]", item.className)} aria-hidden />
              {item.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
