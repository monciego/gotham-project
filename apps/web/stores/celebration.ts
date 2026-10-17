import { create } from "zustand";
import type { CaseMark } from "@/lib/types";

export type CaseCelebration = {
  /** A new key replays the overlay. */
  key: string;
  caseId: number;
  name: string;
  mark: CaseMark;
};

type CelebrationState = {
  celebration: CaseCelebration | null;
  /** The brief overlay when a case passes 25, 50, 75 or 100%. */
  show: (celebration: Omit<CaseCelebration, "key">) => void;
  hide: () => void;
};

export const useCelebrationStore = create<CelebrationState>()((set) => ({
  celebration: null,
  show: (celebration) => set({ celebration: { ...celebration, key: `${Date.now()}` } }),
  hide: () => set({ celebration: null }),
}));
