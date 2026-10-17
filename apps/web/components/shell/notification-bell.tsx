"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@gotham/ui/components/ui/dropdown-menu";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { useUnreadAlerts } from "@/lib/queries";
import { HOME } from "@/lib/routes";

export function NotificationBell() {
  const router = useRouter();
  const { data } = useUnreadAlerts();
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
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel>From Alfred</DropdownMenuLabel>
          {data?.messages.length ? (
            data.messages.slice(0, 5).map((message) => (
              <DropdownMenuItem
                key={message.id}
                onClick={() => router.push(HOME)}
                className="flex-col items-start gap-0.5"
              >
                <span className="font-medium">{message.title}</span>
                <span className="line-clamp-1 text-xs text-muted-foreground">{message.message}</span>
              </DropdownMenuItem>
            ))
          ) : (
            <p className="px-1.5 py-2 text-sm text-muted-foreground">Nothing new, sir.</p>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
