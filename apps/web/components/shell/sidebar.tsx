"use client";

import { Skeleton } from "@gotham/ui/components/ui/skeleton";
import { cn } from "@gotham/ui/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActive, NAV_ITEMS } from "@/lib/nav";
import { useMe } from "@/lib/queries";
import { ModePill } from "./mode-pill";
import { UserAvatar } from "./user-avatar";

export function Sidebar() {
  const pathname = usePathname();
  const { data: user } = useMe();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-16 flex-col border-r border-sidebar-border bg-sidebar md:w-64">
      <div className="flex h-16 items-center justify-center gap-2 border-b border-sidebar-border md:justify-start md:px-5">
        <span aria-hidden className="text-lg">
          🦇
        </span>
        <span className="hidden font-mono text-sm font-semibold tracking-[0.35em] text-primary md:inline">
          ALFRED
        </span>
      </div>

      <nav aria-label="Main" className="flex-1 overflow-y-auto p-2 md:p-3">
        <ul className="grid gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  title={label}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-10 items-center justify-center gap-3 rounded-lg text-sm transition-colors duration-200 md:justify-start md:px-3",
                    active
                      ? "bg-primary font-medium text-primary-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  <span className="sr-only md:not-sr-only">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex items-center justify-center gap-3 border-t border-sidebar-border p-3 md:justify-start">
        {user ? (
          <>
            <UserAvatar user={user} />
            <div className="hidden min-w-0 md:block">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <ModePill mode={user.current_mode} className="mt-1" />
            </div>
          </>
        ) : (
          <>
            <Skeleton className="size-8 rounded-full" />
            <div className="hidden flex-1 gap-1.5 md:grid">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-20" />
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
