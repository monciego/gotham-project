import { cn } from "@gotham/ui/lib/utils";
import { Flame, Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { Dashboard } from "@/lib/types";

function StatCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="font-mono text-xs font-semibold tracking-[0.2em] text-muted-foreground">{label}</h2>
      {children}
    </section>
  );
}

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
}

function Trend({ today, yesterday }: { today: number; yesterday: number }) {
  const [Icon, color, label] =
    today > yesterday
      ? [TrendingUp, "text-emerald-400", "Up"]
      : today < yesterday
        ? [TrendingDown, "text-priority-critical", "Down"]
        : [Minus, "text-muted-foreground", "Level"];

  return (
    <span className={cn("flex items-center gap-1 text-xs", color)}>
      <Icon className="size-4" aria-hidden />
      {label} from {yesterday}% yesterday
    </span>
  );
}

/** One segment per 30 minutes of the goal, filled as focus time accrues. */
function SegmentedBar({ minutes, goal }: { minutes: number; goal: number }) {
  const count = Math.min(12, Math.max(1, Math.round(goal / 30)));
  const size = goal / count;

  return (
    <div className="mt-4 flex gap-1" aria-hidden>
      {Array.from({ length: count }, (_, index) => {
        const fill = Math.min(1, Math.max(0, (minutes - index * size) / size));
        return (
          <div key={index} className="h-2 flex-1 overflow-hidden rounded-sm bg-muted">
            <div className="h-full bg-primary" style={{ width: `${fill * 100}%` }} />
          </div>
        );
      })}
    </div>
  );
}

export function StatCards({ stats }: { stats: Dashboard["stats"] }) {
  const { mission_success: missions, longest_streak: streak, focus_time: focus } = stats;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard label="MISSION SUCCESS">
        {missions.total_due_today > 0 ? (
          <>
            <p className="mt-3 font-mono text-4xl font-semibold text-primary">{missions.percentage}%</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {missions.completed_today}/{missions.total_due_today} missions
            </p>
            <div className="mt-3">
              <Trend today={missions.percentage} yesterday={missions.yesterday_percentage} />
            </div>
          </>
        ) : (
          <>
            <p className="mt-3 font-mono text-4xl font-semibold text-muted-foreground">—</p>
            <p className="mt-1 text-sm text-muted-foreground">No missions due today</p>
          </>
        )}
      </StatCard>

      <StatCard label="LONGEST STREAK">
        <p className="mt-3 flex items-center gap-2 font-mono text-4xl font-semibold">
          <Flame className="size-7 text-priority-high" aria-hidden />
          {streak?.streak_count ?? 0}
          <span className="text-base font-normal text-muted-foreground">{streak?.streak_unit ?? "days"}</span>
        </p>
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {streak?.habit_name ?? "No habits in the Arsenal yet"}
        </p>
      </StatCard>

      <StatCard label="FOCUS TIME">
        <p className="mt-3 font-mono text-4xl font-semibold">{formatMinutes(focus.minutes_today)}</p>
        <SegmentedBar minutes={focus.minutes_today} goal={focus.goal_minutes} />
        <p className="mt-2 text-sm text-muted-foreground">
          {focus.percentage}% of {formatMinutes(focus.goal_minutes)} goal
        </p>
      </StatCard>
    </div>
  );
}
