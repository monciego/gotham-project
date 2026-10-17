"use client";

import { Button } from "@gotham/ui/components/ui/button";
import { useState } from "react";
import { say } from "@/lib/alfred";
import { celebrate } from "@/lib/celebrate";
import { useActOnAlert, useDashboard, useDismissAlert } from "@/lib/queries";
import type { HabitToday } from "@/lib/types";
import { AlertCards } from "./alert-cards";
import { AlfredPanel, type PanelMessage } from "./alfred-panel";
import { HqSkeleton } from "./hq-skeleton";
import { MorningBrief } from "./morning-brief";
import { StatCards } from "./stat-cards";
import { TodaysArsenal } from "./todays-arsenal";
import { TodaysMissions } from "./todays-missions";

const MILESTONE_LINES = { 7: "streak7", 30: "streak30", 100: "streak100" } as const;

export function HqDashboard() {
  const { data, isPending, isError, refetch } = useDashboard();
  const dismiss = useDismissAlert();
  const act = useActOnAlert();
  const [celebration, setCelebration] = useState<PanelMessage | null>(null);

  if (isPending) {
    return <HqSkeleton />;
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground">{say("hqError", 0)}</p>
        <Button variant="outline" className="mt-4" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  function handleMilestone(milestone: number, habit: HabitToday) {
    void celebrate();
    const line = MILESTONE_LINES[milestone as keyof typeof MILESTONE_LINES];
    setCelebration({
      key: `milestone-${habit.id}-${milestone}`,
      mood: "proud",
      title: `${habit.name}: ${milestone} ${habit.streak_unit} in a row`,
      message: line ? say(line, 0) : say("greeting", 0),
      actions: [],
    });
  }

  // The first critical alert gets Alfred's panel; the rest are cards. A celebration takes the panel over.
  const critical = data.alfred_alerts.find((alert) => alert.priority === "critical");
  const cards = data.alfred_alerts.filter((alert) => alert !== critical);
  const panel: PanelMessage | null =
    celebration ?? (critical ? { ...critical, key: `alert-${critical.id}` } : null);

  return (
    <div className="grid gap-6">
      {cards.length > 0 && (
        <div>
          <AlertCards alerts={cards} />
        </div>
      )}

      <MorningBrief dashboard={data} onMilestone={handleMilestone} />
      <StatCards stats={data.stats} />

      <div className="grid gap-6 lg:grid-cols-2">
        <TodaysMissions missions={data.todays_missions} />
        <TodaysArsenal habits={data.todays_arsenal} onMilestone={handleMilestone} />
      </div>

      <AlfredPanel
        message={panel}
        onDismiss={() => (celebration ? setCelebration(null) : critical && dismiss.mutate(critical.id))}
        onAction={() => critical && !celebration && act.mutate(critical.id)}
      />
    </div>
  );
}
