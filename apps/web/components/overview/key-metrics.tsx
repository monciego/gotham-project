import { cn } from "@gotham/ui/lib/utils";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { Overview } from "@/lib/types";

function Metric({ label, children, note }: { label: string; children: React.ReactNode; note?: React.ReactNode }) {
  return (
    <section className="grid content-start gap-1 rounded-xl border border-border bg-card p-4">
      <h3 className="font-mono text-[11px] font-semibold tracking-[0.2em] text-muted-foreground">{label}</h3>
      <p className="mt-1 font-mono text-2xl font-semibold text-primary">{children}</p>
      {note && <div className="text-xs text-muted-foreground">{note}</div>}
    </section>
  );
}

function Change({ percent, previous }: { percent: number | null; previous: number }) {
  if (percent === null) {
    return <span>None in the previous period</span>;
  }

  const [Icon, color] =
    percent > 0 ? [TrendingUp, "text-emerald-400"] : percent < 0 ? [TrendingDown, "text-priority-critical"] : [Minus, ""];

  return (
    <span className={cn("flex items-center gap-1", color)}>
      <Icon className="size-3.5" aria-hidden />
      {percent > 0 && "+"}
      {percent}% vs {previous} before
    </span>
  );
}

export function KeyMetrics({ metrics, days }: { metrics: Overview["key_metrics"]; days: number }) {
  const hours = Math.floor(metrics.total_focus_minutes / 60);
  const minutes = metrics.total_focus_minutes % 60;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      <Metric label="FOCUS TIME" note={`Over ${days} ${days === 1 ? "day" : "days"}`}>
        {hours > 0 && (
          <>
            {hours}
            <span className="text-sm text-muted-foreground"> hours </span>
          </>
        )}
        {minutes}
        <span className="text-sm text-muted-foreground"> min</span>
      </Metric>
      <Metric
        label="MISSIONS"
        note={<Change percent={metrics.missions_change} previous={metrics.missions_completed_previous} />}
      >
        {metrics.missions_completed}
      </Metric>
      <Metric label="HABIT RATE" note="Due habits done">
        {metrics.habit_completion_rate === null ? "—" : `${metrics.habit_completion_rate}%`}
      </Metric>
      <Metric label="ACTIVE STREAKS" note="Habits on a streak now">
        {metrics.active_streaks_count}
      </Metric>
      <Metric label="XP EARNED" note="Missions, focus, habits, Intel, trophies">
        {metrics.xp_earned.toLocaleString("en-US")}
      </Metric>
    </div>
  );
}
