"use client";

import { Button, buttonVariants } from "@gotham/ui/components/ui/button";
import { Input } from "@gotham/ui/components/ui/input";
import { Skeleton } from "@gotham/ui/components/ui/skeleton";
import { cn } from "@gotham/ui/lib/utils";
import { BookOpen, CalendarDays, List, Loader2, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { NativeSelect } from "@/components/forms/native-select";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { type IntelFilters, useIntelInsights, useIntelList } from "@/lib/intel-queries";
import type { IntelInsights, IntelMood } from "@/lib/types";
import { EntryCard } from "./entry-card";
import { IntelCalendar } from "./intel-calendar";
import { EntryListSkeleton } from "./intel-skeletons";
import { JournalInsights } from "./journal-insights";
import { MOODS, moodOf } from "./moods";

type View = "calendar" | "list";

function StatsBar({ insights }: { insights: IntelInsights | undefined }) {
  const average = insights?.mood_average && moodOf(insights.mood_average.mood);
  const stats = [
    { label: "Entries this month", value: insights?.entries_this_month },
    { label: "Journal streak", value: insights && `${insights.streak} ${insights.streak === 1 ? "day" : "days"}` },
    {
      label: "Average mood",
      value: insights && (average ? `${average.emoji} ${average.label} · ${insights.mood_average!.score}` : "–"),
    },
  ];

  return (
    <dl className="grid grid-cols-3 gap-3">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-xl border border-border bg-card p-3 sm:p-4">
          <dt className="text-xs text-muted-foreground">{stat.label}</dt>
          <dd className="mt-1 font-mono text-base sm:text-xl">
            {stat.value === undefined ? <Skeleton className="h-6 w-16" /> : stat.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function EntryList({ filters }: { filters: IntelFilters }) {
  const { data, isPending, isError, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } = useIntelList(filters);
  const entries = data?.pages.flatMap((page) => page.items) ?? [];
  const filtered = filters.search !== "" || filters.mood !== "";

  if (isPending) return <EntryListSkeleton />;
  if (isError) {
    return (
      <div className="grid justify-items-center gap-3 rounded-xl border border-border p-10 text-center">
        <p className="text-muted-foreground">I couldn&apos;t reach the archive, sir.</p>
        <button type="button" className="text-sm text-primary hover:underline" onClick={() => refetch()}>
          Try again
        </button>
      </div>
    );
  }
  if (entries.length === 0) {
    return (
      <div className="grid justify-items-center gap-4 rounded-xl border border-dashed border-border px-6 py-14 text-center">
        <BookOpen className="size-8 text-primary" aria-hidden />
        <p className="max-w-sm text-muted-foreground">
          {filtered
            ? "Nothing matches that, sir. Perhaps loosen the filters?"
            : "No Intel on file yet, sir. Every detective starts with a single note."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {entries.map((entry) => (
        <EntryCard key={entry.id} entry={entry} />
      ))}
      {hasNextPage && (
        <Button variant="outline" className="justify-self-center" disabled={isFetchingNextPage} onClick={() => fetchNextPage()}>
          {isFetchingNextPage && <Loader2 className="animate-spin" aria-hidden />}
          Older entries
        </Button>
      )}
    </div>
  );
}

/** `today` is the user's day (Y-m-d), from the server. */
export function IntelPage({ today }: { today: string }) {
  const [view, setView] = useState<View>("list");
  const [month, setMonth] = useState(today.slice(0, 7));
  const [search, setSearch] = useState("");
  const [mood, setMood] = useState<IntelMood | "">("");
  const filters: IntelFilters = { search: useDebouncedValue(search.trim(), 300), mood };
  const { data: insights } = useIntelInsights();

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold tracking-tight">Intel</h2>
        <Link href="/intel/new" className={buttonVariants()}>
          <Plus aria-hidden />
          New Entry
        </Link>
      </div>

      <StatsBar insights={insights} />

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="grid content-start gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-48 flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search entries and tags"
                aria-label="Search entries and tags"
                className="pl-8"
              />
            </div>
            <NativeSelect aria-label="Mood" value={mood} onChange={(event) => setMood(event.target.value as IntelMood | "")}>
              <option value="">Any mood</option>
              {MOODS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.emoji} {option.label}
                </option>
              ))}
            </NativeSelect>
            <div role="group" aria-label="View" className="flex rounded-lg border border-border p-0.5">
              {(
                [
                  ["calendar", CalendarDays, "Calendar view"],
                  ["list", List, "List view"],
                ] as const
              ).map(([value, Icon, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={view === value}
                  aria-label={label}
                  title={label}
                  onClick={() => setView(value)}
                  className={cn(
                    "flex size-7 items-center justify-center rounded-md transition-colors duration-200",
                    view === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                </button>
              ))}
            </div>
          </div>

          {view === "calendar" ? (
            <IntelCalendar month={month} onMonthChange={setMonth} filters={filters} today={today} />
          ) : (
            <EntryList filters={filters} />
          )}
        </div>

        <JournalInsights insights={insights} />
      </div>
    </div>
  );
}
