import { create } from "zustand";
import type { Rewards } from "@/lib/types";

type Trophy = Rewards["trophies"][number];

/** One thing to celebrate, shown one at a time by RewardsHost. */
export type Celebration =
  | { kind: "trophy"; key: string; trophy: Trophy }
  | { kind: "level"; key: string; level: number };

type RewardsState = {
  /** Trophies first, then the level reached. */
  queue: Celebration[];
  /** The small "+25 XP" toast, for XP earned without a trophy or level to celebrate. */
  xpToast: { key: string; amount: number } | null;
  /** While true (the focus screen), rewards aren't shown: that screen has its own summary. */
  suppressed: boolean;
  receive: (rewards: Rewards) => void;
  next: () => void;
  clearXpToast: () => void;
  setSuppressed: (suppressed: boolean) => void;
};

let sequence = 0;
const nextKey = () => `${Date.now()}-${sequence++}`;

export const useRewardsStore = create<RewardsState>()((set, get) => ({
  queue: [],
  xpToast: null,
  suppressed: false,
  receive: (rewards) => {
    if (get().suppressed) return;

    const celebrations: Celebration[] = [
      ...rewards.trophies.map((trophy): Celebration => ({ kind: "trophy", key: nextKey(), trophy })),
      ...(rewards.level_up ? [{ kind: "level", key: nextKey(), level: rewards.level_up.to } as const] : []),
    ];

    if (celebrations.length > 0) {
      set((state) => ({ queue: [...state.queue, ...celebrations] }));
    } else if (rewards.xp_total > 0) {
      set({ xpToast: { key: nextKey(), amount: rewards.xp_total } });
    }
  },
  next: () => set((state) => ({ queue: state.queue.slice(1) })),
  clearXpToast: () => set({ xpToast: null }),
  setSuppressed: (suppressed) => set({ suppressed }),
}));
