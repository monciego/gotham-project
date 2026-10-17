import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import type { ApiEnvelope, LevelProgress, TrophyCase, XpEvent } from "./types";

export const trophyKeys = {
  all: ["trophies"] as const,
  list: ["trophies", "list"] as const,
  xpHistory: ["trophies", "xp-history"] as const,
};

export function useTrophies() {
  return useQuery({
    queryKey: trophyKeys.list,
    queryFn: async () => (await api.get<ApiEnvelope<TrophyCase>>("/trophies")).data.data,
  });
}

export function useXpHistory() {
  return useQuery({
    queryKey: trophyKeys.xpHistory,
    queryFn: async () =>
      (await api.get<ApiEnvelope<{ level: LevelProgress; events: XpEvent[] }>>("/user/xp-history", { params: { limit: 15 } }))
        .data.data,
  });
}

/** Level progress from the user's totals: 1,000 XP a level. */
export function levelProgress(totalXp: number, level: number) {
  const start = (level - 1) * 1000;
  const into = Math.max(0, totalXp - start);
  return { start, next: start + 1000, into, percent: Math.min(100, (into / 1000) * 100) };
}
