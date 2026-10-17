"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { say } from "@/lib/alfred";
import { useArsenalToday } from "@/lib/arsenal-queries";
import { celebrate } from "@/lib/celebrate";
import { useMe } from "@/lib/queries";
import { HOME } from "@/lib/routes";
import { useAlfredStore } from "@/stores/alfred";
import { CheckInSkeleton } from "./arsenal-skeletons";
import { CheckInRow } from "./check-in-row";

function longDate(timezone?: string): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: timezone }).format(
    new Date(),
  );
}

export function ArsenalToday() {
  const { data: habits, isPending, isError, refetch } = useArsenalToday();
  const { data: user } = useMe();
  // Skips count as handled, but there's only something to celebrate if something was done.
  const done = habits?.filter((habit) => habit.completed || habit.skipped).length ?? 0;
  const total = habits?.length ?? 0;
  const allDone = total > 0 && done === total && !!habits?.some((habit) => habit.completed);
  // Celebrate finishing the list here, not arriving at an already-finished one.
  const wasAllDone = useRef<boolean | null>(null);

  useEffect(() => {
    if (!habits) return;
    if (wasAllDone.current === false && allDone) {
      void celebrate();
      useAlfredStore.getState().say({
        mood: "proud",
        title: say("arsenalAllDone", 0),
        message: say("arsenalAllDoneDetail", 0),
      });
    }
    wasAllDone.current = allDone;
  }, [habits, allDone]);

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <Link href={HOME} className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        Back to HQ
      </Link>

      <header className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Today&apos;s Arsenal</h2>
          <p className="mt-1 text-sm text-muted-foreground" suppressHydrationWarning>
            {longDate(user?.timezone)}
          </p>
        </div>
        {total > 0 && (
          <p className="font-mono text-2xl text-primary" aria-label={`${done} of ${total} done`}>
            {done}/{total}
          </p>
        )}
      </header>

      {total > 0 && (
        <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div
            className="h-full bg-primary transition-[width] duration-300"
            style={{ width: `${(done / total) * 100}%` }}
          />
        </div>
      )}

      {isPending ? (
        <CheckInSkeleton />
      ) : isError ? (
        <div className="grid justify-items-center gap-3 rounded-xl border border-border p-10 text-center">
          <p className="text-muted-foreground">{say("error", 0)}</p>
          <button type="button" className="text-sm text-primary hover:underline" onClick={() => refetch()}>
            Try again
          </button>
        </div>
      ) : total === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-muted-foreground">
          {say("arsenalTodayEmpty", 0)}
        </p>
      ) : (
        <ul className="grid gap-3">
          {habits.map((habit) => (
            <CheckInRow key={habit.id} habit={habit} />
          ))}
        </ul>
      )}
    </div>
  );
}
