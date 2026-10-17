import { Briefcase, Coffee, type LucideIcon, Scale, Shield, Wine } from "lucide-react";
import type { Mode } from "./types";

type ModeInfo = {
  label: string;
  /** The mode's accent: the pill dot and the sidebar's active item. */
  color: string;
  icon: LucideIcon;
  description: string;
  /** What actually changes in this mode, from the API's rules. */
  changes: string[];
};

export const MODES: Record<Mode, ModeInfo> = {
  batman: {
    label: "Batman",
    color: "#d4af37",
    icon: Shield,
    description: "Full intensity. The mission comes before everything.",
    changes: ["No grace days: one missed day ends a streak", "Habits set for Batman mode join the list"],
  },
  wayne: {
    label: "Wayne",
    color: "#3b82f6",
    icon: Briefcase,
    description: "The executive. Work and the company come first.",
    changes: ["No grace days on streaks", "Habits set for Wayne mode join the list"],
  },
  bruce: {
    label: "Bruce",
    color: "#10b981",
    icon: Scale,
    description: "Balanced. The work, the habits and the man behind them.",
    changes: ["One missed day forgiven per streak", "Habits set for Bruce mode join the list"],
  },
  playboy: {
    label: "Playboy",
    color: "#ec4899",
    icon: Wine,
    description: "People and pleasure. Keep the essentials, enjoy the rest.",
    changes: ["No grace days on streaks", "Habits set for Playboy mode join the list"],
  },
  rest: {
    label: "Rest",
    color: "#6b7280",
    icon: Coffee,
    description: "Recovery. Rest is productive too.",
    changes: [
      "Two missed days forgiven per streak",
      "No “haven't started” or burnout alerts",
      "The morning brief doesn't push a mission",
    ],
  },
};

export const MODE_ORDER: Mode[] = ["batman", "wayne", "bruce", "playboy", "rest"];
