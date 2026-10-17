import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { say } from "@/lib/alfred";
import type { Mission } from "@/lib/types";
import { PriorityBadge } from "@/components/missions/priority-badge";
import { StartSessionButton } from "@/components/missions/start-session-button";
import { SectionCard } from "@/components/section-card";

export function TodaysMissions({ missions }: { missions: Mission[] }) {
  return (
    <SectionCard
      title="TODAY'S MISSIONS"
      action={
        <Link href="/missions" className="text-xs text-muted-foreground hover:text-primary">
          View all
        </Link>
      }
    >
      {missions.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{say("noMissionsToday", 0)}</p>
      ) : (
        <ul className="divide-y divide-border">
          {missions.map((mission) => (
            <li key={mission.id} className="flex items-center gap-3 py-3">
              <PriorityBadge priority={mission.priority} />
              <div className="min-w-0 flex-1">
                <Link href={`/missions/${mission.id}`} className="block truncate text-sm hover:text-primary">
                  {mission.title}
                </Link>
                {mission.times_postponed > 0 && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-amber-400">
                    <AlertTriangle className="size-3" aria-hidden />
                    Postponed {mission.times_postponed}×
                  </p>
                )}
              </div>
              <StartSessionButton missionId={mission.id} compactLabel />
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
