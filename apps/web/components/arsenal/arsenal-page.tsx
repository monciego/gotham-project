"use client";

import { buttonVariants } from "@gotham/ui/components/ui/button";
import { CalendarCheck, Plus, Zap } from "lucide-react";
import Link from "next/link";
import { say } from "@/lib/alfred";
import { useArsenal } from "@/lib/arsenal-queries";
import type { Habit } from "@/lib/types";
import { HabitGridSkeleton } from "./arsenal-skeletons";
import { HabitCard } from "./habit-card";

function Section({ title, habits }: { title: string; habits: Habit[] }) {
  return (
    <section className="grid gap-3" aria-labelledby={`${title}-heading`}>
      <h3 id={`${title}-heading`} className="font-mono text-xs font-semibold tracking-[0.2em] text-muted-foreground">
        {title.toUpperCase()} · {habits.length}
      </h3>
      <div className="grid gap-3 md:grid-cols-2">
        {habits.map((habit) => (
          <HabitCard key={habit.id} habit={habit} />
        ))}
      </div>
    </section>
  );
}

export function ArsenalPage() {
  const { data: habits, isPending, isError, refetch } = useArsenal();
  const active = habits?.filter((habit) => habit.active) ?? [];
  const archived = habits?.filter((habit) => !habit.active) ?? [];

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold tracking-tight">Arsenal</h2>
        <div className="flex gap-2">
          <Link href="/arsenal/today" className={buttonVariants({ variant: "outline" })}>
            <CalendarCheck aria-hidden />
            Today&apos;s check-in
          </Link>
          <Link href="/arsenal/new" className={buttonVariants()}>
            <Plus aria-hidden />
            New Habit
          </Link>
        </div>
      </div>

      {isPending ? (
        <HabitGridSkeleton />
      ) : isError ? (
        <div className="grid justify-items-center gap-3 rounded-xl border border-border p-10 text-center">
          <p className="text-muted-foreground">{say("error", 0)}</p>
          <button type="button" className="text-sm text-primary hover:underline" onClick={() => refetch()}>
            Try again
          </button>
        </div>
      ) : habits.length === 0 ? (
        <div className="grid justify-items-center gap-4 rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <Zap className="size-8 text-primary" aria-hidden />
          <p className="max-w-sm text-lg">{say("arsenalEmpty", 0)}</p>
          <Link href="/arsenal/new" className={buttonVariants()}>
            <Plus aria-hidden />
            New Habit
          </Link>
        </div>
      ) : (
        <>
          {active.length > 0 && <Section title="Active" habits={active} />}
          {archived.length > 0 && <Section title="Archived" habits={archived} />}
        </>
      )}
    </div>
  );
}
