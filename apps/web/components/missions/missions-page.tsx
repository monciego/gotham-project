"use client";

import { Button, buttonVariants } from "@gotham/ui/components/ui/button";
import { cn } from "@gotham/ui/lib/utils";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { say } from "@/lib/alfred";
import { type MissionFilters, useMissions } from "@/lib/mission-queries";
import { KanbanBoard } from "./kanban-board";
import { MissionCard } from "./mission-card";
import { MissionFiltersBar, type MissionLayout } from "./mission-filters";
import { MissionListSkeleton } from "./mission-skeletons";

const DEFAULT_FILTERS: MissionFilters = {
  view: "today",
  status: "",
  priority: "",
  search: "",
  sort: "due_date",
};

export function MissionsPage() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [search, setSearch] = useState("");
  const [layout, setLayout] = useState<MissionLayout>("list");
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const query = useMissions({ ...filters, search: debouncedSearch });
  const missions = (query.data?.pages.flatMap((page) => page.items) ?? []).filter(
    // Kanban has no abandoned column.
    (mission) => layout === "list" || mission.status !== "abandoned",
  );
  const filtered = Boolean(filters.status || filters.priority || debouncedSearch);

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {query.data ? `${query.data.pages[0]?.meta.total ?? 0} missions` : " "}
        </p>
        <Link href="/missions/new" className={buttonVariants()}>
          <Plus aria-hidden />
          New Mission
        </Link>
      </div>

      <MissionFiltersBar
        filters={filters}
        onChange={(changes) => setFilters((current) => ({ ...current, ...changes }))}
        search={search}
        onSearchChange={setSearch}
        layout={layout}
        onLayoutChange={setLayout}
      />

      {query.isPending ? (
        <MissionListSkeleton />
      ) : query.isError ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">{say("hqError", 0)}</p>
          <Button variant="outline" className="mt-4" onClick={() => query.refetch()}>
            Try again
          </Button>
        </div>
      ) : missions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground">{say(filtered ? "noMissionsFiltered" : "noMissions", 0)}</p>
          {!filtered && (
            <Link href="/missions/new" className={cn(buttonVariants({ variant: "outline" }), "mt-4")}>
              <Plus aria-hidden />
              New Mission
            </Link>
          )}
        </div>
      ) : (
        // Dimmed while results for new filters load over the old ones.
        <div className={cn("transition-opacity duration-200", query.isPlaceholderData && "opacity-60")}>
          {layout === "list" ? (
            <ul className="grid gap-3">
              {missions.map((mission) => (
                <li key={mission.id}>
                  <MissionCard mission={mission} />
                </li>
              ))}
            </ul>
          ) : (
            <KanbanBoard missions={missions} />
          )}

          {query.hasNextPage && (
            <div className="mt-6 flex justify-center">
              <Button
                variant="outline"
                onClick={() => query.fetchNextPage()}
                disabled={query.isFetchingNextPage}
              >
                {query.isFetchingNextPage ? "Loading…" : "Load more"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
