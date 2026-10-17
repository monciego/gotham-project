"use client";

import { Input } from "@gotham/ui/components/ui/input";
import { cn } from "@gotham/ui/lib/utils";
import { Columns3, List, Search } from "lucide-react";
import { NativeSelect } from "@/components/forms/native-select";
import type { MissionFilters, MissionSort, MissionView } from "@/lib/mission-queries";
import type { MissionStatus, Priority } from "@/lib/types";
import { STATUS_LABELS } from "./status-badge";

export type MissionLayout = "list" | "kanban";

const VIEWS: { value: MissionView; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "upcoming", label: "Upcoming" },
  { value: "overdue", label: "Overdue" },
  { value: "all", label: "All" },
];

type MissionFiltersBarProps = {
  filters: MissionFilters;
  onChange: (changes: Partial<MissionFilters>) => void;
  search: string;
  onSearchChange: (search: string) => void;
  layout: MissionLayout;
  onLayoutChange: (layout: MissionLayout) => void;
};

export function MissionFiltersBar({
  filters,
  onChange,
  search,
  onSearchChange,
  layout,
  onLayoutChange,
}: MissionFiltersBarProps) {
  return (
    <div className="grid gap-3">
      <div role="tablist" aria-label="When" className="flex gap-1 border-b border-border">
        {VIEWS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={filters.view === value}
            onClick={() => onChange({ view: value })}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm whitespace-nowrap transition-colors duration-200",
              filters.view === value
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search missions"
            aria-label="Search missions"
            className="pl-8"
          />
        </div>

        <NativeSelect
          aria-label="Priority"
          value={filters.priority}
          onChange={(event) => onChange({ priority: event.target.value as Priority | "" })}
        >
          <option value="">Any priority</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </NativeSelect>

        <NativeSelect
          aria-label="Status"
          value={filters.status}
          onChange={(event) => onChange({ status: event.target.value as MissionStatus | "" })}
        >
          <option value="">Any status</option>
          {(Object.keys(STATUS_LABELS) as MissionStatus[]).map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </NativeSelect>

        <NativeSelect
          aria-label="Sort by"
          value={filters.sort}
          onChange={(event) => onChange({ sort: event.target.value as MissionSort })}
        >
          <option value="due_date">Sort: due date</option>
          <option value="priority">Sort: priority</option>
          <option value="times_postponed">Sort: most postponed</option>
        </NativeSelect>

        <div role="group" aria-label="Layout" className="flex rounded-lg border border-border p-0.5">
          {(
            [
              ["list", List, "List"],
              ["kanban", Columns3, "Kanban"],
            ] as const
          ).map(([value, Icon, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={layout === value}
              aria-label={label}
              title={label}
              onClick={() => onLayoutChange(value)}
              className={cn(
                "flex size-7 items-center justify-center rounded-md transition-colors duration-200",
                layout === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
