"use client";

import { Button, buttonVariants } from "@gotham/ui/components/ui/button";
import { Skeleton } from "@gotham/ui/components/ui/skeleton";
import { cn } from "@gotham/ui/lib/utils";
import Link from "next/link";
import { say } from "@/lib/alfred";
import { useAlfredAction, useAllAlfredMessages, useReadAllMessages } from "@/lib/alfred-queries";
import { formatDateTime } from "@/lib/format";
import { MOOD_ACCENT } from "./moods";
import { MoodIcon } from "./mood-icon";

/** Everything Alfred has said lately (the latest 50), with actions on those still waiting. */
export function AlfredMessagesPage() {
  const { data, isPending, isError, refetch } = useAllAlfredMessages();
  const act = useAlfredAction();
  const readAll = useReadAllMessages();

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold tracking-tight">From Alfred</h2>
        <Button variant="outline" size="sm" disabled={!data?.unread_count} onClick={() => readAll.mutate()}>
          Mark all read
        </Button>
      </div>

      {isPending ? (
        <div className="grid gap-3" aria-busy="true" aria-label="Loading messages">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <div className="grid justify-items-center gap-3 rounded-xl border border-border p-10 text-center">
          <p className="text-muted-foreground">{say("error", 0)}</p>
          <button type="button" className="text-sm text-primary hover:underline" onClick={() => refetch()}>
            Try again
          </button>
        </div>
      ) : data.messages.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-6 py-10 text-center text-muted-foreground">
          Nothing yet, sir. I&apos;ll speak up when it matters.
        </p>
      ) : (
        <ul className="grid gap-3">
          {data.messages.map((message) => {
            const waiting = !message.action_taken && !message.dismissed_at;
            return (
              <li
                key={message.id}
                className={cn(
                  "flex items-start gap-3 rounded-xl border border-l-4 border-border bg-card p-4",
                  MOOD_ACCENT[message.mood],
                  !waiting && "opacity-70",
                )}
              >
                <MoodIcon mood={message.mood} className="mt-0.5 size-5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className={cn("text-sm", !message.read_at ? "font-semibold" : "font-medium")}>{message.title}</p>
                    <span className="text-xs text-muted-foreground">{formatDateTime(message.created_at)}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{message.message}</p>
                  {waiting && message.actions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {message.actions.map((action) =>
                        action.href ? (
                          <Link
                            key={action.label}
                            href={action.href}
                            onClick={() => act.mutate({ id: message.id, action: "link" })}
                            className={buttonVariants({ variant: "outline", size: "sm" })}
                          >
                            {action.label}
                          </Link>
                        ) : (
                          action.action &&
                          action.action !== "dismiss" && (
                            <Button
                              key={action.label}
                              size="sm"
                              variant={action.variant === "primary" ? "default" : action.variant === "danger" ? "destructive" : "outline"}
                              disabled={act.isPending}
                              onClick={() => act.mutate({ id: message.id, action: action.action! })}
                            >
                              {action.label}
                            </Button>
                          )
                        ),
                      )}
                    </div>
                  )}
                  {message.action_taken && <p className="mt-2 text-xs text-muted-foreground">Done.</p>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
