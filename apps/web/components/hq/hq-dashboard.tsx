"use client";

import { Button } from "@gotham/ui/components/ui/button";
import { say } from "@/lib/alfred";
import { celebrate } from "@/lib/celebrate";
import { useActOnAlert, useDashboard, useDismissAlert } from "@/lib/queries";
import type { HabitToday } from "@/lib/types";
import { useAlfredStore } from "@/stores/alfred";
import { AlertCards } from "./alert-cards";
import { AlfredPanel } from "@/components/alfred/alfred-panel";
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
  const alfredSays = useAlfredStore((state) => state.say);
  const toast = useAlfredStore((state) => state.toast);

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
    alfredSays({
      mood: "proud",
      title: `${habit.name}: ${milestone} ${habit.streak_unit} in a row`,
      message: line ? say(line, 0) : say("greeting", 0),
    });
  }

  // The first critical alert gets Alfred's panel and the rest are cards.
  // While Alfred is saying something else (a toast), the critical alert waits.
  const critical = data.alfred_alerts.find((alert) => alert.priority === "critical");
  const cards = data.alfred_alerts.filter((alert) => alert !== critical);

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
        message={critical && !toast ? { ...critical, key: `alert-${critical.id}` } : null}
        onDismiss={() => critical && dismiss.mutate(critical.id)}
        onAction={() => critical && act.mutate(critical.id)}
      />
    </div>
  );
}
