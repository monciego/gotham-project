import type { IntelMood } from "@/lib/types";

/** Best to worst. */
export const MOODS: { value: IntelMood; emoji: string; label: string; color: string }[] = [
  { value: "great", emoji: "😊", label: "Great", color: "#10b981" },
  { value: "good", emoji: "😃", label: "Good", color: "#3b82f6" },
  { value: "okay", emoji: "😐", label: "Okay", color: "#f59e0b" },
  { value: "bad", emoji: "😟", label: "Bad", color: "#f97316" },
  { value: "terrible", emoji: "😢", label: "Terrible", color: "#ef4444" },
];

export function moodOf(value: IntelMood) {
  return MOODS.find((mood) => mood.value === value)!;
}

/** Energy and stress words for a 1–10 level. */
export function levelWord(level: number): string {
  return level <= 3 ? "Low" : level <= 6 ? "Moderate" : "High";
}

const LONG_DATE = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const SHORT_DATE = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

/** Dates arrive as Y-m-d; read them as UTC so no timezone shifts the day. */
export function longDate(date: string): string {
  return LONG_DATE.format(new Date(`${date}T00:00:00Z`));
}

export function shortDate(date: string): string {
  return SHORT_DATE.format(new Date(`${date}T00:00:00Z`));
}
