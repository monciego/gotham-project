"use client";

import { buttonVariants } from "@gotham/ui/components/ui/button";
import { cn } from "@gotham/ui/lib/utils";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useAlfredAction, useAlfredMessages, useDismissMessage } from "@/lib/alfred-queries";
import { MOOD_ACCENT } from "./moods";
import { MoodIcon } from "./mood-icon";

/** At most this many cards at once; the bell holds the rest. */
const MAX_CARDS = 3;

/**
 * Alfred's non-critical messages as cards above the page content, on every
 * page. Critical ones get his panel instead (AlfredHost).
 */
export function AlfredAlerts() {
  const { data } = useAlfredMessages();
  const dismiss = useDismissMessage();
  const act = useAlfredAction();
  const cards = (data?.messages ?? [])
    .filter((message) => message.priority !== "critical" && !message.read_at && !message.dismissed_at)
    .slice(0, MAX_CARDS);

  return (
    <div aria-live="polite">
      <AnimatePresence initial={false}>
        {cards.map((alert) => (
          <motion.div
            key={alert.id}
            layout
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.25 }}
            className="mb-3 overflow-hidden"
          >
            <div
              role="status"
              className={cn("flex items-start gap-3 rounded-xl border border-l-4 border-border bg-card p-4", MOOD_ACCENT[alert.mood])}
            >
              <MoodIcon mood={alert.mood} className="mt-0.5 size-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{alert.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{alert.message}</p>
                {alert.actions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {alert.actions.map((action) =>
                      action.href ? (
                        <Link
                          key={action.label}
                          href={action.href}
                          onClick={() => act.mutate({ id: alert.id, action: "link" })}
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                        >
                          {action.label}
                        </Link>
                      ) : (
                        <button
                          key={action.label}
                          type="button"
                          disabled={act.isPending}
                          onClick={() =>
                            action.action === "dismiss"
                              ? dismiss.mutate(alert.id)
                              : act.mutate({ id: alert.id, action: action.action! })
                          }
                          className={buttonVariants({
                            variant: action.variant === "primary" ? "default" : action.variant === "danger" ? "destructive" : "outline",
                            size: "sm",
                          })}
                        >
                          {action.label}
                        </button>
                      ),
                    )}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss.mutate(alert.id)}
                aria-label={`Dismiss "${alert.title}"`}
                className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
