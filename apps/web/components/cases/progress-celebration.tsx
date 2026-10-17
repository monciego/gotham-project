"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect } from "react";
import { type AlfredEvent, say } from "@/lib/alfred";
import { useCelebrationStore } from "@/stores/celebration";

const SHOW_FOR_MS = 3500;

/** The brief overlay when a case passes 25, 50, 75 or 100%. Click anywhere to dismiss. */
export function ProgressCelebration() {
  const celebration = useCelebrationStore((state) => state.celebration);
  const hide = useCelebrationStore((state) => state.hide);

  useEffect(() => {
    if (!celebration) return;
    const timer = setTimeout(hide, SHOW_FOR_MS);
    return () => clearTimeout(timer);
  }, [celebration, hide]);

  return (
    <AnimatePresence>
      {celebration && (
        <motion.div
          key={celebration.key}
          role="status"
          aria-live="polite"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={hide}
          className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-6 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.92, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="grid max-w-md justify-items-center gap-3 text-center"
          >
            <span className="font-mono text-xs tracking-[0.3em] text-muted-foreground">{celebration.name.toUpperCase()}</span>
            <span className="font-mono text-7xl font-semibold text-primary">{celebration.mark}%</span>
            <p className="text-lg">{say(`caseMark${celebration.mark}` as AlfredEvent, 0)}</p>
            <Link
              href={`/cases/${celebration.caseId}`}
              className="text-sm text-primary hover:underline"
            >
              {celebration.mark === 100 ? "Close the case" : "Open case"}
            </Link>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
