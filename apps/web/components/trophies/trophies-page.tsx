"use client";

import { Skeleton } from "@gotham/ui/components/ui/skeleton";
import { cn } from "@gotham/ui/lib/utils";
import { useState } from "react";
import { SectionCard } from "@/components/section-card";
import { say } from "@/lib/alfred";
import { formatDateTime } from "@/lib/format";
import { useMe } from "@/lib/queries";
import { useTrophies, useXpHistory } from "@/lib/trophy-queries";
import type { Trophy } from "@/lib/types";
import { AchievementCard } from "./achievement-card";
import { LevelCard } from "./level-card";

type Filter = "all" | "habits" | "missions" | "focus" | "special";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "habits", label: "Habits" },
  { value: "missions", label: "Missions" },
  { value: "focus", label: "Focus" },
  { value: "special", label: "Special" },
];

/** API categories by tab; everything not listed is Special. */
const TAB_CATEGORIES: Record<Exclude<Filter, "all" | "special">, string[]> = {
  habits: ["arsenal"],
  missions: ["missions", "cases"],
  focus: ["focus"],
};

function inTab(trophy: Trophy, filter: Filter): boolean {
  if (filter === "all") return true;
  if (filter === "special") return !Object.values(TAB_CATEGORIES).flat().includes(trophy.category);
  return TAB_CATEGORIES[filter].includes(trophy.category);
}

function RecentXp() {
  const { data } = useXpHistory();
  if (!data || data.events.length === 0) return null;

  return (
    <SectionCard title="RECENT XP">
      <ul className="grid gap-2 text-sm">
        {data.events.slice(0, 8).map((event) => (
          <li key={event.id} className="flex items-center justify-between gap-3">
            <span className="min-w-0 truncate">
              {event.label ?? event.reason}
              <span className="ml-2 text-xs text-muted-foreground">{formatDateTime(event.created_at)}</span>
            </span>
            <span className={cn("shrink-0 font-mono", event.amount > 0 ? "text-primary" : "text-muted-foreground")}>
              {event.amount > 0 ? "+" : ""}
              {event.amount} XP
            </span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

export function TrophiesPage() {
  const { data, isPending, isError, refetch } = useTrophies();
  const { data: user } = useMe();
  const [filter, setFilter] = useState<Filter>("all");
  const shown = data?.trophies.filter((trophy) => inTab(trophy, filter)) ?? [];
  // Earned first, then the closest to being earned.
  const sorted = [...shown].sort(
    (a, b) =>
      Number(b.earned) - Number(a.earned) ||
      (b.progress ? b.progress.current / b.progress.target : 0) - (a.progress ? a.progress.current / a.progress.target : 0),
  );

  return (
    <div className="grid gap-6">
      <h2 className="text-2xl font-semibold tracking-tight">Trophies</h2>

      {isPending ? (
        <div className="grid gap-6" aria-busy="true" aria-label="Loading trophies">
          <Skeleton className="h-40 rounded-xl" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-44 rounded-xl" />
            ))}
          </div>
        </div>
      ) : isError ? (
        <div className="grid justify-items-center gap-3 rounded-xl border border-border p-10 text-center">
          <p className="text-muted-foreground">{say("error", 0)}</p>
          <button type="button" className="text-sm text-primary hover:underline" onClick={() => refetch()}>
            Try again
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <LevelCard level={data.level} summary={data.summary} name={user?.name ?? "Bruce Wayne"} />
            <RecentXp />
          </div>

          <div role="tablist" aria-label="Filter trophies" className="flex flex-wrap gap-1 border-b border-border">
            {FILTERS.map(({ value, label }) => {
              const inFilter = data.trophies.filter((trophy) => inTab(trophy, value));
              return (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={filter === value}
                  onClick={() => setFilter(value)}
                  className={cn(
                    "-mb-px border-b-2 px-3 py-2 text-sm transition-colors duration-200",
                    filter === value
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                  <span className="ml-1.5 font-mono text-xs text-muted-foreground">
                    {inFilter.filter((trophy) => trophy.earned).length}/{inFilter.length}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((trophy) => (
              <AchievementCard key={trophy.id} trophy={trophy} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
