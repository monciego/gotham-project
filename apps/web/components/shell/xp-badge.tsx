import Link from "next/link";
import { levelProgress } from "@/lib/trophy-queries";
import type { User } from "@/lib/types";

const numberFormat = new Intl.NumberFormat("en-US");

/** "Lv.3" with a thin bar of progress to the next level; hovering shows the numbers. */
export function XpBadge({ user }: { user: User }) {
  const progress = levelProgress(user.total_xp, user.current_level);
  const details = `Level ${user.current_level} · ${numberFormat.format(user.total_xp)} XP · ${numberFormat.format(
    progress.next - user.total_xp,
  )} to Level ${user.current_level + 1}`;

  return (
    <Link
      href="/trophies"
      aria-label={details}
      className="group relative hidden flex-col gap-1 rounded-full bg-primary/10 px-2.5 pt-0.5 pb-1 transition-colors duration-200 hover:bg-primary/15 sm:flex"
    >
      <span className="font-mono text-xs text-primary">
        Lv.{user.current_level} · {numberFormat.format(user.total_xp)} XP
      </span>
      <span className="h-0.5 w-full overflow-hidden rounded-full bg-primary/20" aria-hidden>
        <span
          className="block h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${progress.percent}%` }}
        />
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute top-full right-0 z-30 mt-2 rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs whitespace-nowrap text-foreground opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        {details}
      </span>
    </Link>
  );
}
