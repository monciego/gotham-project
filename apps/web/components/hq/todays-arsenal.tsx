"use client";

import Link from "next/link";
import { say } from "@/lib/alfred";
import type { HabitToday } from "@/lib/types";
import { HabitCheck } from "./habit-check";
import { SectionCard } from "./section-card";

type TodaysArsenalProps = {
  habits: HabitToday[];
  onMilestone: (milestone: number, habit: HabitToday) => void;
};

export function TodaysArsenal({ habits, onMilestone }: TodaysArsenalProps) {
  const done = habits.filter((habit) => habit.completed).length;

  return (
    <SectionCard
      title="TODAY'S ARSENAL"
      action={
        habits.length > 0 ? (
          <span className="font-mono text-xs text-muted-foreground">
            {done}/{habits.length}
          </span>
        ) : (
          <Link href="/arsenal" className="text-xs text-muted-foreground hover:text-primary">
            Open Arsenal
          </Link>
        )
      }
    >
      {habits.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{say("noArsenalToday", 0)}</p>
      ) : (
        <div className="-mx-2">
          {habits.map((habit) => (
            <HabitCheck key={habit.id} habit={habit} onMilestone={onMilestone} />
          ))}
        </div>
      )}
    </SectionCard>
  );
}
