"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { trophyKeys } from "@/lib/trophy-queries";
import { queryKeys } from "@/lib/queries";
import { useRewardsStore } from "@/stores/rewards";
import { RewardModals } from "./reward-modals";
import { XpToast } from "./xp-toast";

/**
 * Celebrates whatever API responses earned (stores/rewards.ts): trophy and
 * level-up modals one at a time, else a small XP toast. Lives in the
 * (gotham) layout; the focus screen suppresses rewards (SuppressRewards).
 */
export function RewardsHost() {
  const queryClient = useQueryClient();
  const queue = useRewardsStore((state) => state.queue);
  const next = useRewardsStore((state) => state.next);
  const xpToast = useRewardsStore((state) => state.xpToast);

  // New XP or trophies: the header's level and the trophy case are stale.
  useEffect(() => {
    if (queue.length === 0 && !xpToast) return;
    void queryClient.invalidateQueries({ queryKey: queryKeys.me });
    void queryClient.invalidateQueries({ queryKey: trophyKeys.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.alerts });
  }, [queue.length, xpToast, queryClient]);

  return (
    <>
      <RewardModals queue={queue} onDone={next} />
      <XpToast />
    </>
  );
}

/** Mounted on the focus screen, which shows rewards in its own summary. */
export function SuppressRewards() {
  const setSuppressed = useRewardsStore((state) => state.setSuppressed);

  useEffect(() => {
    setSuppressed(true);
    return () => setSuppressed(false);
  }, [setSuppressed]);

  return null;
}
