"use client";

import { buttonVariants } from "@gotham/ui/components/ui/button";
import { cn } from "@gotham/ui/lib/utils";
import { Briefcase, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { say } from "@/lib/alfred";
import { useCases } from "@/lib/case-queries";
import type { CaseStatus } from "@/lib/types";
import { CaseCard } from "./case-card";
import { CaseGridSkeleton } from "./case-skeletons";

type Filter = "all" | CaseStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "planning", label: "Planning" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

/** "All" leaves out archived cases; they have their own tab once there are any. */
function matches(status: CaseStatus, filter: Filter): boolean {
  return filter === "all" ? status !== "archived" : status === filter;
}

export function CasesPage() {
  const { data: cases, isPending, isError, refetch } = useCases();
  const [filter, setFilter] = useState<Filter>("all");
  const shown = cases?.filter((item) => matches(item.status, filter)) ?? [];
  const count = (value: Filter) => cases?.filter((item) => matches(item.status, value)).length ?? 0;
  const tabs = FILTERS.filter(({ value }) => value !== "archived" || count("archived") > 0 || filter === "archived");

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold tracking-tight">Cases</h2>
        <Link href="/cases/new" className={buttonVariants()}>
          <Plus aria-hidden />
          New Case
        </Link>
      </div>

      <div role="tablist" aria-label="Filter cases" className="flex flex-wrap gap-1 border-b border-border">
        {tabs.map(({ value, label }) => (
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
            {cases && <span className="ml-1.5 font-mono text-xs text-muted-foreground">{count(value)}</span>}
          </button>
        ))}
      </div>

      {isPending ? (
        <CaseGridSkeleton />
      ) : isError ? (
        <div className="grid justify-items-center gap-3 rounded-xl border border-border p-10 text-center">
          <p className="text-muted-foreground">{say("error", 0)}</p>
          <button type="button" className="text-sm text-primary hover:underline" onClick={() => refetch()}>
            Try again
          </button>
        </div>
      ) : cases.length === 0 ? (
        <div className="grid justify-items-center gap-4 rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <Briefcase className="size-8 text-primary" aria-hidden />
          <p className="max-w-sm text-lg">{say("casesEmpty", 0)}</p>
          <Link href="/cases/new" className={buttonVariants()}>
            <Plus aria-hidden />
            New Case
          </Link>
        </div>
      ) : shown.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-6 py-10 text-center text-muted-foreground">
          {say("casesFiltered", 0)}
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {shown.map((item) => (
            <CaseCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
