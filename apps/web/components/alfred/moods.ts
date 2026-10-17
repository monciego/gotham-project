import type { AlfredMood } from "@/lib/types";

/** Alfred's mood sets the border colour of his panel. */
export const MOOD_BORDER: Record<AlfredMood, string> = {
  concerned: "border-amber-500",
  proud: "border-emerald-500",
  disappointed: "border-red-600",
  encouraging: "border-blue-500",
};

/** The same colours as a left accent, for alert cards. */
export const MOOD_ACCENT: Record<AlfredMood, string> = {
  concerned: "border-l-amber-500",
  proud: "border-l-emerald-500",
  disappointed: "border-l-red-600",
  encouraging: "border-l-blue-500",
};
