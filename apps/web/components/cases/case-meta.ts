import { COLORS } from "@/components/operations/operation-meta";
import type { Case, CaseColor, CaseMark, CaseStatus } from "@/lib/types";

export const STATUS_LABELS: Record<CaseStatus, string> = {
  planning: "Planning",
  active: "Active",
  on_hold: "On hold",
  completed: "Completed",
  archived: "Archived",
};

/** The same six presets as Operations events. */
export const CASE_COLORS: Record<CaseColor, string> = COLORS;

export const MARKS: CaseMark[] = [25, 50, 75, 100];

export function caseColor(item: Pick<Case, "color">): string {
  return CASE_COLORS[item.color ?? "gray"];
}

export function isOpen(item: Pick<Case, "status">): boolean {
  return item.status === "planning" || item.status === "active" || item.status === "on_hold";
}

/** "Oct 17, 2026", from YYYY-MM-DD without a timezone shift. */
export function formatDay(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );
}
