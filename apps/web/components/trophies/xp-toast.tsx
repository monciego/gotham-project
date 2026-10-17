"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { useAlfredStore } from "@/stores/alfred";
import { useRewardsStore } from "@/stores/rewards";

const SHOW_FOR_MS = 2000;

/**
 * "+25 XP", briefly, bottom-right. Alfred's panel lives there too, so while
 * it is showing the toast moves to the top-right, under the XP badge.
 */
export function XpToast() {
  const toast = useRewardsStore((state) => state.xpToast);
  const clear = useRewardsStore((state) => state.clearXpToast);
  const alfredSpeaking = useAlfredStore((state) => state.toast !== null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(clear, SHOW_FOR_MS);
    return () => clearTimeout(timer);
  }, [toast, clear]);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.key}
          role="status"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={`pointer-events-none fixed right-4 z-50 rounded-full border border-primary/50 bg-card px-4 py-1.5 font-mono text-sm font-semibold text-primary shadow-lg shadow-black/50 ${
            alfredSpeaking ? "top-20" : "bottom-4"
          }`}
        >
          +{toast.amount} XP
        </motion.div>
      )}
    </AnimatePresence>
  );
}
