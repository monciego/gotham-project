"use client";

import { buttonVariants } from "@gotham/ui/components/ui/button";
import { cn } from "@gotham/ui/lib/utils";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { MissionCard } from "@/components/missions/mission-card";
import { say } from "@/lib/alfred";
import type { Mission, MissionStatus } from "@/lib/types";

type Filter = "all" | Exclude<MissionStatus, "abandoned">;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

export function CaseMissions({ caseId, missions, open }: { caseId: number; missions: Mission[]; open: boolean }) {
  const [filter, setFilter] = useState<Filter>("all");
  const shown = filter === "all" ? missions : missions.filter((mission) => mission.status === filter);

  return (
    <section aria-labelledby="case-missions-heading" className="grid content-start gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="case-missions-heading" className="font-mono text-xs font-semibold tracking-[0.2em] text-muted-foreground">
          MISSIONS · {missions.length}
        </h3>
        {open && (
          <Link href={`/missions/new?case=${caseId}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <Plus aria-hidden />
            Add Mission to Case
          </Link>
        )}
      </div>

      {missions.length > 0 && (
        <div role="tablist" aria-label="Filter missions" className="flex flex-wrap gap-1">
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={filter === value}
              onClick={() => setFilter(value)}
              className={cn(
                "rounded-lg px-3 py-1 text-sm transition-colors duration-200",
                filter === value ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {missions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
          {say("caseMissionsEmpty", 0)}
        </p>
      ) : shown.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{say("noMissionsFiltered", 0)}</p>
      ) : (
        <div className="grid gap-3">
          {shown.map((mission) => (
            <MissionCard key={mission.id} mission={mission} />
          ))}
        </div>
      )}
    </section>
  );
}
