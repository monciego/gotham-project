import type { CalendarEntry, OperationCategory, OperationColor } from "@/lib/types";

export const CATEGORY_LABELS: Record<OperationCategory, string> = {
  work: "Work",
  personal: "Personal",
  health: "Health",
  social: "Social",
  other: "Other",
};

export const COLORS: Record<OperationColor, string> = {
  gray: "#6b7280",
  blue: "#3b82f6",
  purple: "#8b5cf6",
  red: "#ef4444",
  teal: "#14b8a6",
  pink: "#ec4899",
};

export const REMINDERS: { value: number; label: string }[] = [
  { value: 15, label: "15 minutes before" },
  { value: 30, label: "30 minutes before" },
  { value: 60, label: "1 hour before" },
  { value: 1440, label: "1 day before" },
];

export const FREQUENCY_LABELS = { daily: "Daily", weekly: "Weekly", monthly: "Monthly", yearly: "Yearly" } as const;

const GOLD = "#d4af37";
const GREEN = "#10b981";

/** Missions and focus blocks are gold, habits green, other events their chosen color (gray by default). */
export function entryColor(entry: CalendarEntry): string {
  if (entry.kind === "focus_block" || entry.mission) return GOLD;
  if (entry.kind === "habit") return GREEN;
  return COLORS[entry.color ?? "gray"];
}

/** "YYYY-MM-DD" plus or minus days. */
export function addDays(date: string, days: number): string {
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + days);
  return day.toISOString().slice(0, 10);
}

/** A Date's local "YYYY-MM-DD" and "HH:mm". */
export function localParts(date: Date): { date: string; time: string } {
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
}

/** "Mon, Oct 19 · 14:00 – 15:30", or the days for all-day entries. */
export function entryWhen(entry: CalendarEntry): string {
  if (entry.all_day) {
    const last = addDays(entry.end, -1);
    const day = (value: string) =>
      new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(
        new Date(`${value}T00:00:00Z`),
      );
    return last === entry.start ? `${day(entry.start)} · All day` : `${day(entry.start)} – ${day(last)}`;
  }

  const start = new Date(entry.start);
  const end = new Date(entry.end);
  const day = start.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const time = (value: Date) => value.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${day} · ${time(start)} – ${time(end)}`;
}
