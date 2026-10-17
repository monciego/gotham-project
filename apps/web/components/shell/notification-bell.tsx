"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@gotham/ui/components/ui/dropdown-menu";
import { cn } from "@gotham/ui/lib/utils";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { MoodIcon } from "@/components/alfred/mood-icon";
import { useAlfredMessages, useReadAllMessages, useReadMessage } from "@/lib/alfred-queries";
import { formatDateTime } from "@/lib/format";

/** Unread count, the last five messages, "Mark all read" and the full list. */
export function NotificationBell() {
  const router = useRouter();
  const { data } = useAlfredMessages();
  const read = useReadMessage();
  const readAll = useReadAllMessages();
  const count = data?.unread_count ?? 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={count ? `${count} unread messages from Alfred` : "Messages from Alfred"}
        className="relative flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Bell className="size-4" aria-hidden />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-mono text-[10px] font-semibold text-primary-foreground">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuGroup>
          <div className="flex items-center justify-between gap-2 pr-1">
            <DropdownMenuLabel>From Alfred</DropdownMenuLabel>
            {count > 0 && (
              <button
                type="button"
                onClick={() => readAll.mutate()}
                className="rounded px-1.5 py-0.5 text-xs text-primary hover:bg-accent"
              >
                Mark all read
              </button>
            )}
          </div>
          {data?.messages.length ? (
            data.messages.slice(0, 5).map((message) => (
              <DropdownMenuItem
                key={message.id}
                onClick={() => {
                  if (!message.read_at) read.mutate(message.id);
                  router.push("/alfred");
                }}
                className="items-start gap-2"
              >
                <MoodIcon mood={message.mood} className="mt-0.5 size-4 shrink-0" />
                <span className="grid min-w-0 gap-0.5">
                  <span className={cn("truncate", !message.read_at && "font-semibold")}>{message.title}</span>
                  <span className="line-clamp-2 text-xs text-muted-foreground">{message.message}</span>
                  <span className="text-[11px] text-muted-foreground">{formatDateTime(message.created_at)}</span>
                </span>
                {!message.read_at && <span aria-label="Unread" className="mt-1.5 ml-auto size-1.5 shrink-0 rounded-full bg-primary" />}
              </DropdownMenuItem>
            ))
          ) : (
            <p className="px-1.5 py-2 text-sm text-muted-foreground">Nothing new, sir.</p>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/alfred")} className="justify-center text-primary">
          View all
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
