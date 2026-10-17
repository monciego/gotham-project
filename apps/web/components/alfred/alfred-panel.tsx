"use client";

import { buttonVariants } from "@gotham/ui/components/ui/button";
import { cn } from "@gotham/ui/lib/utils";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import type { AlfredAction, AlfredMood } from "@/lib/types";
import { ButlerSilhouette } from "./butler-silhouette";
import { MOOD_BORDER } from "./moods";

export type PanelMessage = {
  /** A new key replays the entrance animation. */
  key: string;
  mood: AlfredMood;
  title: string;
  message: string;
  actions: AlfredAction[];
};

type AlfredPanelProps = {
  message: PanelMessage | null;
  onDismiss: () => void;
  onAction: () => void;
};

/** Alfred himself, bottom-right, for the messages that can't wait. */
export function AlfredPanel({ message, onDismiss, onAction }: AlfredPanelProps) {
  return (
    <AnimatePresence>
      {message && (
        <motion.aside
          key={message.key}
          role="alert"
          aria-label="Message from Alfred"
          initial={{ x: "120%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "120%", opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed right-4 bottom-4 z-40 flex w-[min(22rem,calc(100vw-6rem))] flex-col items-end gap-2"
        >
          <div
            className={cn(
              "relative w-full rounded-xl border-2 bg-card p-4 shadow-2xl shadow-black/60",
              MOOD_BORDER[message.mood],
            )}
          >
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss"
              className="absolute top-2 right-2 rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="size-4" aria-hidden />
            </button>
            <p className="pr-6 text-sm font-semibold">{message.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{message.message}</p>
            {message.actions.some((action) => action.href) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {message.actions.map(
                  (action) =>
                    action.href && (
                      <Link
                        key={action.label}
                        href={action.href}
                        onClick={onAction}
                        className={buttonVariants({ size: "sm" })}
                      >
                        {action.label}
                      </Link>
                    ),
                )}
              </div>
            )}
            {/* Speech bubble tail, pointing down at Alfred. */}
            <span
              aria-hidden
              className={cn(
                "absolute -bottom-[7px] right-9 size-3 rotate-45 border-r-2 border-b-2 bg-card",
                MOOD_BORDER[message.mood],
              )}
            />
          </div>
          <div className="flex items-center gap-2 pr-4">
            <span className="font-mono text-[10px] tracking-[0.3em] text-primary">ALFRED</span>
            <ButlerSilhouette className="h-14 w-11" />
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
