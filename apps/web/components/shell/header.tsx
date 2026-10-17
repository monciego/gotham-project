"use client";

import { Skeleton } from "@gotham/ui/components/ui/skeleton";
import { usePathname } from "next/navigation";
import { sectionTitle } from "@/lib/nav";
import { useMe } from "@/lib/queries";
import { ModePill } from "./mode-pill";
import { NotificationBell } from "./notification-bell";
import { SearchButton } from "./search-button";
import { UserMenu } from "./user-menu";
import { XpBadge } from "./xp-badge";

export function Header() {
  const pathname = usePathname();
  const { data: user } = useMe();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur md:px-8">
      <h1 className="flex-1 truncate text-lg font-semibold tracking-tight">{sectionTitle(pathname)}</h1>

      <SearchButton />

      {user ? (
        <>
          <ModePill mode={user.current_mode} className="hidden sm:inline-flex" />
          <XpBadge user={user} />
          <NotificationBell />
          <UserMenu user={user} />
        </>
      ) : (
        <div className="flex items-center gap-3">
          <Skeleton className="hidden h-5 w-24 rounded-full sm:block" />
          <Skeleton className="hidden h-5 w-28 rounded-full sm:block" />
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="size-8 rounded-full" />
        </div>
      )}
    </header>
  );
}
