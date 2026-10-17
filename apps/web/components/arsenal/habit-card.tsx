import { cn } from "@gotham/ui/lib/utils";
import Link from "next/link";
import type { Habit } from "@/lib/types";
import { CategoryBadge, StreakCount, TypeBadge } from "./habit-badges";
import { scheduleLabel } from "./habit-meta";
import { QuickComplete } from "./quick-complete";

export function HabitCard({ habit }: { habit: Habit }) {
  return (
    <article
      className={cn(
        "relative grid gap-4 rounded-xl border border-border bg-card p-4 transition-colors duration-200 hover:border-primary/40",
        !habit.active && "opacity-70",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {/* The whole card opens the habit; the button below sits above this link. */}
          <Link href={`/arsenal/${habit.id}`} className="font-medium after:absolute after:inset-0 hover:text-primary">
            {habit.name}
          </Link>
          <p className="mt-0.5 text-xs text-muted-foreground">{scheduleLabel(habit)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <CategoryBadge category={habit.category} />
          <TypeBadge type={habit.type} />
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Streak</dt>
          <dd>
            <StreakCount habit={habit} />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Best</dt>
          <dd className="font-mono">
            {habit.best_streak} {habit.streak_unit === "weeks" ? "w" : "d"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">This month</dt>
          <dd className="font-mono">{habit.month_rate === null ? "–" : `${habit.month_rate}%`}</dd>
        </div>
      </dl>

      {habit.active_today && (
        <div className="relative z-10 flex justify-end">
          <QuickComplete habit={habit} />
        </div>
      )}
    </article>
  );
}
