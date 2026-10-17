import { Zap } from "lucide-react";
import { SectionCard } from "@/components/section-card";
import { formatDateTime, formatMinutes } from "@/lib/format";
import type { MissionDetail } from "@/lib/types";

export function FocusHistory({ mission }: { mission: MissionDetail }) {
  const finished = mission.focus_sessions.filter((session) => session.end_time);

  return (
    <SectionCard
      title="FOCUS SESSIONS"
      action={
        <span className="font-mono text-xs text-primary">{formatMinutes(mission.total_focus_minutes)} invested</span>
      }
    >
      {finished.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">No sessions yet, sir.</p>
      ) : (
        <ul className="divide-y divide-border text-sm">
          {finished.map((session) => (
            <li key={session.id} className="flex items-center justify-between gap-3 py-2">
              <div>
                <p>{formatDateTime(session.start_time)}</p>
                <p className="text-xs text-muted-foreground">{session.completed ? "Completed" : "Stopped early"}</p>
              </div>
              <div className="text-right">
                <p className="font-mono">{formatMinutes(session.duration_minutes)}</p>
                {(session.energy_before || session.energy_after) && (
                  <p className="flex items-center justify-end gap-1 font-mono text-xs text-muted-foreground">
                    <Zap className="size-3" aria-label="Energy" />
                    {session.energy_before ?? "–"} → {session.energy_after ?? "–"}
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
