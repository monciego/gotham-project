"use client";

import { Skeleton } from "@gotham/ui/components/ui/skeleton";
import { cn } from "@gotham/ui/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MODES } from "@/lib/modes";
import { isActive, NAV_ITEMS } from "@/lib/nav";
import { useMe } from "@/lib/queries";
import { ModePill } from "./mode-pill";
import { UserAvatar } from "./user-avatar";

export function Sidebar() {
  const pathname = usePathname();
  const { data: user } = useMe();
  // The life mode's colour runs along the top of the sidebar; gold until the user loads.
  const accent = user ? MODES[user.current_mode].color : "var(--primary)";
  // Settings → Appearance. On until the user says otherwise.
  const showSubtitles = user?.show_nav_subtitles ?? true;

  return (
    <aside
      style={{ "--mode": accent } as React.CSSProperties}
      className="fixed inset-y-0 left-0 z-30 flex w-16 flex-col border-r border-sidebar-border bg-sidebar md:w-64"
    >
      <div className="flex h-16 shrink-0 items-center justify-center gap-3 border-b border-sidebar-border shadow-[inset_0_2px_0_var(--mode)] transition-shadow duration-300 md:justify-start md:px-5">
        <span aria-hidden className="text-2xl leading-none">
          🦇
        </span>
        <div className="hidden leading-tight md:block">
          <span className="block text-xl font-bold tracking-widest text-primary">ALFRED</span>
          <span className="block text-[10px] tracking-widest text-muted-foreground uppercase">Gotham Project</span>
        </div>
      </div>

      <nav aria-label="Main" className="flex-1 overflow-y-auto p-2 md:p-3">
        <ul className="grid gap-1">
          {NAV_ITEMS.map(({ href, label, subtitle, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  title={`${label} (${subtitle})`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-10 items-center justify-center gap-3 rounded-lg transition-colors duration-200 md:justify-start md:px-4 md:py-3",
                    active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-sidebar-accent",
                  )}
                >
                  <Icon size={18} className="shrink-0" aria-hidden />
                  <span className="sr-only grid md:not-sr-only">
                    <span className="text-sm font-medium">{label}</span>
                    <AnimatePresence initial={false}>
                      {showSubtitles && (
                        <motion.span
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                          className={cn(
                            "block overflow-hidden text-xs",
                            // Muted grey that still reads as small text: #8A8A92 on the dark sidebar, #6B7280 on the light one.
                            active ? "text-primary-foreground" : "text-[#6b7280] dark:text-[#8a8a92]",
                          )}
                        >
                          {subtitle}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </span>
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
