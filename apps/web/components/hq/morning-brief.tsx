"use client";

import { BracketCard } from "@gotham/ui/components/bracket-card";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { say } from "@/lib/alfred";
import type { Dashboard, HabitToday } from "@/lib/types";
import { HabitCheck } from "./habit-check";
import { PriorityBadge } from "@/components/missions/priority-badge";
import { QuickStartButton } from "@/components/focus/quick-start-button";

type MorningBriefProps = {
  dashboard: Dashboard;
  onMilestone: (milestone: number, habit: HabitToday) => void;
};

export function MorningBrief({ dashboard, onMilestone }: MorningBriefProps) {
  const { greeting, mission, quote } = dashboard.morning_brief;

  // The API lists unfinished habits, so a refetch would drop the one just checked.
  // Keep the first three for this visit and read their live state from today's arsenal.
  const [habitIds] = useState(() => dashboard.morning_brief.habits.map((habit) => habit.id));
  const habits = habitIds
    .map((id) => dashboard.todays_arsenal.find((habit) => habit.id === id))
    .filter((habit): habit is HabitToday => habit !== undefined);

  return (
    <BracketCard className="p-6 md:p-8">
      <p className="font-mono text-xs tracking-[0.3em] text-primary">MORNING BRIEF</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">{greeting}</h2>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div>
          {mission ? (
            <>
              <p className="text-xs text-muted-foreground">
                {mission.is_overdue ? "Overdue. Start here." : "Your first mission today"}
              </p>
              <div className="mt-2 flex items-start gap-2">
                <PriorityBadge priority={mission.priority} />
                <Link href={`/missions/${mission.id}`} className="text-lg leading-snug font-medium hover:text-primary">
                  {mission.title}
                </Link>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{mission.why_it_matters}</p>
              {mission.times_postponed > 0 && (
                <p className="mt-3 flex items-center gap-1.5 text-sm text-amber-400">
                  <AlertTriangle className="size-4" aria-hidden />
                  Postponed {mission.times_postponed} {mission.times_postponed === 1 ? "time" : "times"}
                </p>
              )}
              <QuickStartButton
                missionId={mission.id}
                variant="default"
                size="lg"
                className="mt-5 h-11 w-full font-mono tracking-[0.2em]"
              >
                START YOUR DAY
              </QuickStartButton>
            </>
          ) : (
            <p className="text-muted-foreground">{say("noMission", 0)}</p>
          )}
        </div>

        {habits.length > 0 && (
          <div className="lg:border-l lg:border-border lg:pl-6">
            <p className="mb-1 px-2 text-xs text-muted-foreground">Before the day gets away</p>
            {habits.map((habit) => (
              <HabitCheck key={habit.id} habit={habit} onMilestone={onMilestone} />
            ))}
          </div>
        )}
      </div>

      <blockquote className="mt-8 border-t border-border pt-5 text-sm text-muted-foreground">
        <p className="italic">“{quote.text}”</p>
        <footer className="mt-1 text-xs">— {quote.author}</footer>
      </blockquote>
    </BracketCard>
  );
}
