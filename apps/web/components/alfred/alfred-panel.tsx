"use client";

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
  /** A button or link was used. Links navigate on their own. */
  onAction: (action: AlfredAction) => void;
  /** While an action runs, its buttons wait. */
  busy?: boolean;
};

/** Buttons on the white speech bubble. */
const VARIANTS: Record<NonNullable<AlfredAction["variant"]>, string> = {
  primary: "bg-zinc-900 text-white hover:bg-zinc-700",
  secondary: "border border-zinc-300 text-zinc-800 hover:bg-zinc-100",
  danger: "bg-red-600 text-white hover:bg-red-700",
  ghost: "text-zinc-500 hover:text-zinc-900",
};

const BUTTON = "inline-flex h-8 items-center rounded-md px-3 text-sm font-medium transition-colors duration-200 disabled:opacity-50";

/**
 * Alfred himself, bottom-right, above everything: a speech bubble over his
 * silhouette, ringed in his mood's colour. For messages that can't wait and
 * for his toasts.
 */
export function AlfredPanel({ message, onDismiss, onAction, busy }: AlfredPanelProps) {
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
          className="fixed right-4 bottom-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col items-end gap-2"
        >
          <div className={cn("relative w-full rounded-xl border-2 bg-white p-4 text-zinc-900 shadow-2xl shadow-black/60", MOOD_BORDER[message.mood])}>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss"
              className="absolute top-2 right-2 rounded p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            >
              <X className="size-4" aria-hidden />
            </button>
            <p className="pr-6 text-base font-bold tracking-wide [font-variant-caps:all-small-caps]">{message.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-zinc-700">{message.message}</p>

            {message.actions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {message.actions.map((action) =>
                  action.href ? (
                    <Link
                      key={action.label}
                      href={action.href}
                      onClick={() => onAction(action)}
                      className={cn(BUTTON, VARIANTS[action.variant ?? "primary"])}
                    >
                      {action.label}
                    </Link>
                  ) : (
                    <button
                      key={action.label}
                      type="button"
                      disabled={busy}
                      onClick={() => onAction(action)}
                      className={cn(BUTTON, VARIANTS[action.variant ?? "primary"])}
                    >
                      {action.label}
                    </button>
                  ),
                )}
              </div>
            )}

            {/* Speech bubble tail, pointing down at Alfred. */}
            <span
              aria-hidden
              className={cn("absolute -bottom-[7px] right-9 size-3 rotate-45 border-r-2 border-b-2 bg-white", MOOD_BORDER[message.mood])}
            />
          </div>
          <div className="flex items-center gap-2 pr-3">
            <span className="font-mono text-[10px] tracking-[0.3em] text-primary">ALFRED</span>
            <span className={cn("grid size-14 place-items-end justify-center overflow-hidden rounded-full border-2 bg-black", MOOD_BORDER[message.mood])}>
              <ButlerSilhouette className="h-12 w-9" />
            </span>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
