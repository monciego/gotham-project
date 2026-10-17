import { formatMinutes } from "@/lib/format";
import type { CaseAnalytics } from "@/lib/types";

export function CaseStats({ analytics }: { analytics: CaseAnalytics }) {
  const stats = [
    { label: "Focus time", value: formatMinutes(analytics.total_focus_minutes) },
    { label: "Missions done", value: analytics.missions_completed },
    { label: "Missions left", value: analytics.missions_remaining },
    { label: "Weeks elapsed", value: analytics.weeks_elapsed },
  ];

  return (
    <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {stats.map(({ label, value }) => (
        <div key={label} className="rounded-xl border border-border bg-card p-4">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="mt-1 font-mono text-2xl font-semibold">{value}</dd>
        </div>
      ))}
      <p className="col-span-full -mt-1 text-xs text-muted-foreground">
        <span className="font-mono">{analytics.missions_per_week}</span> missions a week on average.
      </p>
    </dl>
  );
}
