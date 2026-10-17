import type { User } from "./types";

export const MODES: Record<User["current_mode"], { label: string; color: string }> = {
  batman: { label: "Batman", color: "#d4af37" },
  wayne: { label: "Wayne", color: "#3b82f6" },
  bruce: { label: "Bruce", color: "#10b981" },
  playboy: { label: "Playboy", color: "#ec4899" },
  rest: { label: "Rest", color: "#6b7280" },
};
