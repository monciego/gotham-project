import type { HabitCategory, HabitFrequency, HabitType } from "./types";

export const ONBOARDING_STEPS = 7;

/** The simplified schedules onboarding offers, as the API's habit type and frequency. */
export const HABIT_SCHEDULES: { value: string; label: string; type: HabitType; frequency: HabitFrequency }[] = [
  { value: "daily", label: "Every day", type: "daily", frequency: {} },
  { value: "weekdays", label: "Weekdays", type: "specific_days", frequency: { days: [1, 2, 3, 4, 5] } },
  { value: "weekly", label: "3× a week", type: "weekly", frequency: { times: 3 } },
];

export const HABIT_SUGGESTIONS: { name: string; category: HabitCategory; schedule: string }[] = [
  { name: "Morning Exercise", category: "physical", schedule: "daily" },
  { name: "Read 30 Minutes", category: "learning", schedule: "daily" },
  { name: "Journal", category: "mental", schedule: "daily" },
];

export const MAX_ONBOARDING_HABITS = 3;

/** This week's Sunday (today, on a Sunday) as Y-m-d, from today's Y-m-d. */
export function endOfWeek(today: string): string {
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + ((7 - date.getUTCDay()) % 7));
  return date.toISOString().slice(0, 10);
}
