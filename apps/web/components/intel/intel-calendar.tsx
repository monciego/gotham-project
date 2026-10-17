"use client";

import { Button } from "@gotham/ui/components/ui/button";
import { Skeleton } from "@gotham/ui/components/ui/skeleton";
import { cn } from "@gotham/ui/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { type IntelFilters, useIntelMonth } from "@/lib/intel-queries";
import { shiftMonth } from "@/lib/money";
import { moodOf } from "./moods";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_TITLE = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

type IntelCalendarProps = {
  month: string;
  onMonthChange: (month: string) => void;
  filters: IntelFilters;
  /** Today in the user's timezone (Y-m-d): later days can't have entries. */
  today: string;
};

/** A month grid. Days with an entry carry a dot in their mood's color and open the entry. */
export function IntelCalendar({ month, onMonthChange, filters, today }: IntelCalendarProps) {
  const { data, isPending } = useIntelMonth(month, filters);
  const byDate = new Map(data?.items.map((entry) => [entry.date, entry]));

  const [year, monthNumber] = month.split("-").map(Number) as [number, number];
  const leading = new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const cells = [...Array<null>(leading).fill(null), ...Array.from({ length: days }, (_, index) => index + 1)];

  return (
    <div className="grid gap-4 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon-sm" aria-label="Previous month" onClick={() => onMonthChange(shiftMonth(month, -1))}>
          <ChevronLeft aria-hidden />
        </Button>
        <h3 className="font-medium" aria-live="polite">
          {MONTH_TITLE.format(new Date(Date.UTC(year, monthNumber - 1, 1)))}
        </h3>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Next month"
          disabled={month >= today.slice(0, 7)}
          onClick={() => onMonthChange(shiftMonth(month, 1))}
        >
          <ChevronRight aria-hidden />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((day) => (
          <span key={day} className="pb-1 font-mono text-[11px] text-muted-foreground" aria-hidden>
            {day}
          </span>
        ))}
        {cells.map((day, index) => {
          if (day === null) return <span key={`blank-${index}`} />;

          const date = `${month}-${String(day).padStart(2, "0")}`;
          const entry = byDate.get(date);
          const mood = entry && moodOf(entry.mood);
          const future = date > today;
          const cell = cn(
            "flex aspect-square flex-col items-center justify-center gap-1 rounded-lg text-sm transition-colors duration-200",
            date === today && "ring-1 ring-primary ring-inset",
          );
          const dot = mood ? (
            <span className="size-2 rounded-full" style={{ backgroundColor: mood.color }} aria-hidden />
          ) : (
            <span className="size-2" aria-hidden />
          );

          if (isPending) return <Skeleton key={date} className="aspect-square rounded-lg" />;
          if (entry) {
            return (
              <Link key={date} href={`/intel/${entry.id}`} aria-label={`${date}: ${mood!.label}`} className={cn(cell, "hover:bg-accent")}>
                {day}
                {dot}
              </Link>
            );
          }
          if (future) {
            return (
              <span key={date} className={cn(cell, "text-muted-foreground/40")}>
                {day}
                {dot}
              </span>
            );
          }
          return (
            <Link
              key={date}
              href={`/intel/new?date=${date}`}
              aria-label={`${date}: no entry, write one`}
              className={cn(cell, "text-muted-foreground hover:bg-accent hover:text-foreground")}
            >
              {day}
              {dot}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
