"use client";

import { buttonVariants } from "@gotham/ui/components/ui/button";
import { cn } from "@gotham/ui/lib/utils";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useActOnAlert, useDismissAlert } from "@/lib/queries";
import type { AlfredMessage } from "@/lib/types";
import { MOOD_ACCENT } from "@/components/alfred/moods";

/** Alfred's messages as dismissible cards at the top of HQ. */
export function AlertCards({ alerts }: { alerts: AlfredMessage[] }) {
  const dismiss = useDismissAlert();
  const act = useActOnAlert();

  return (
    <AnimatePresence initial={false}>
      {alerts.map((alert) => (
        <motion.div
          key={alert.id}
          layout
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.25 }}
          className="mb-3 overflow-hidden"
        >
          <div
            role="status"
            className={cn(
              "flex items-start gap-3 rounded-xl border border-l-4 border-border bg-card p-4",
              MOOD_ACCENT[alert.mood],
            )}
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{alert.title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{alert.message}</p>
              {alert.actions.some((action) => action.href) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {alert.actions.map(
                    (action) =>
                      action.href && (
                        <Link
                          key={action.label}
                          href={action.href}
                          onClick={() => act.mutate(alert.id)}
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                        >
                          {action.label}
                        </Link>
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
  );
}
