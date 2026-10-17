import type { Habit, HabitCategory, HabitType, Mode } from "@/lib/types";

export const CATEGORY_LABELS: Record<HabitCategory, string> = {
  health: "Health",
  productivity: "Productivity",
  learning: "Learning",
  social: "Social",
  mental: "Mental",
  physical: "Physical",
  other: "Other",
};

export const TYPE_LABELS: Record<HabitType, string> = {
  daily: "Daily",
  weekly: "Weekly",
  specific_days: "Specific days",
  interval: "Interval",
  measurable: "Measurable",
  yes_no: "Yes / No",
};

export const MODE_LABELS: Record<Mode, string> = {
  batman: "Batman",
  wayne: "Wayne",
  bruce: "Bruce",
  playboy: "Playboy",
  rest: "Rest",
};

/** Sunday first, as the form and heatmap show them. Values are ISO weekdays (1 = Monday). */
export const WEEKDAYS = [
  { iso: 7, short: "Sun" },
  { iso: 1, short: "Mon" },
  { iso: 2, short: "Tue" },
  { iso: 3, short: "Wed" },
  { iso: 4, short: "Thu" },
  { iso: 5, short: "Fri" },
  { iso: 6, short: "Sat" },
];

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category as HabitCategory] ?? category.charAt(0).toUpperCase() + category.slice(1);
}

/** "Every day", "3× a week", "Mon, Wed, Fri", "Every 3 days", "20 pages a day". */
export function scheduleLabel(habit: Habit): string {
  switch (habit.type) {
    case "weekly":
      return `${habit.frequency.times ?? 1}× a week`;
    case "specific_days":
      return WEEKDAYS.filter((day) => habit.frequency.days?.includes(day.iso))
        .map((day) => day.short)
        .join(", ");
    case "interval":
      return `Every ${habit.frequency.every ?? 1} days`;
    case "measurable":
      return `${habit.target_value} ${habit.unit ?? ""} a day`.trim();
    default:
      return "Every day";
  }
}

export function streakLabel(habit: Pick<Habit, "current_streak" | "streak_unit">): string {
  const unit = habit.current_streak === 1 ? habit.streak_unit.slice(0, -1) : habit.streak_unit;
  return `${habit.current_streak} ${unit}`;
}
