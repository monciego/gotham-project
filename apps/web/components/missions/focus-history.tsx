import { Zap } from "lucide-react";
import { SectionCard } from "@/components/section-card";
import { formatDateTime, formatMinutes } from "@/lib/format";
import type { MissionDetail } from "@/lib/types";

/** The mission's finished sessions. The total counts completed ones, like the mission's time does. */
export function FocusHistory({ mission }: { mission: MissionDetail }) {
  const finished = mission.focus_sessions.filter((session) => session.end_time);
  const total = finished
    .filter((session) => session.completed)
    .reduce((sum, session) => sum + session.duration_minutes, 0);

  return (
    <SectionCard
      title="FOCUS SESSIONS"
      action={<span className="font-mono text-xs text-primary">{formatMinutes(total)} total</span>}
    >
      {finished.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">No sessions yet, sir.</p>
      ) : (
        <ul className="divide-y divide-border text-sm">
          {finished.map((session) => (
            <li key={session.id} className="flex items-center justify-between gap-3 py-2">
              <div>
                <p>{formatDateTime(session.start_time)}</p>
                <p className={session.completed ? "text-xs text-emerald-400" : "text-xs text-muted-foreground"}>
                  {session.completed ? "Completed" : "Abandoned"}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono">{formatMinutes(session.duration_minutes)}</p>
                {session.energy_after !== null && (
                  <p className="flex items-center justify-end gap-1 font-mono text-xs text-muted-foreground">
                    <Zap className="size-3" aria-label="Energy after" />
                    {session.energy_after}/10
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
