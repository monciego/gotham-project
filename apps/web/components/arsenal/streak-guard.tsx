"use client";

import { Button } from "@gotham/ui/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@gotham/ui/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { say } from "@/lib/alfred";
import { useArsenalToday, useCompleteHabit } from "@/lib/arsenal-queries";
import { useMe } from "@/lib/queries";
import { useAlfredStore } from "@/stores/alfred";

/** From this hour (in the user's timezone), Alfred guards streaks. */
const EVENING_HOUR = 20;
const STORAGE_KEY = "gotham-streak-dismissed";

function hourIn(timezone: string): number {
  return Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: timezone }).format(new Date()));
}

/** Y-m-d in the user's timezone. */
function dateIn(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date());
}

/** Habits waved off today ("I don't care"), so Alfred asks only once per habit per day. */
function dismissedOn(date: string): number[] {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as { date: string; ids: number[] } | null;
    return stored?.date === date ? stored.ids : [];
  } catch {
    return [];
  }
}

function dismiss(date: string, id: number) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ date, ids: [...dismissedOn(date), id] }));
  } catch {
    // Not remembered; Alfred may ask again on the next page.
  }
}

/**
 * In the evening, on arriving at a page or moving to another, warns about a
 * streak longer than 3 that ends tonight unless the habit is done. Lives in
 * the (gotham) layout.
 */
export function StreakGuard() {
  const pathname = usePathname();
  const { data: user } = useMe();
  const [evening, setEvening] = useState(false);
  const { data: habits } = useArsenalToday({ enabled: evening });
  const complete = useCompleteHabit();
  const [habitId, setHabitId] = useState<number | null>(null);
  const checkedPath = useRef<string | null>(null);

  // The clock moves on, so look again on every navigation.
  useEffect(() => {
    if (user) setEvening(hourIn(user.timezone) >= EVENING_HOUR);
  }, [user, pathname]);

  useEffect(() => {
    if (!user || !evening || !habits || checkedPath.current === pathname) return;
    checkedPath.current = pathname;

    const waved = dismissedOn(dateIn(user.timezone));
    const atRisk = habits.find((habit) => habit.streak_at_risk && !waved.includes(habit.id));
    if (atRisk) setHabitId(atRisk.id);
  }, [user, evening, habits, pathname]);

  const habit = habits?.find((item) => item.id === habitId);
  if (!user || !habit) return null;

  function close() {
    if (habit && user) dismiss(dateIn(user.timezone), habit.id);
    setHabitId(null);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className="gap-5 p-8 text-center sm:max-w-sm">
        <DialogTitle className="font-mono text-xs font-normal tracking-[0.3em] text-priority-critical">
          {say("streakDanger", 0)}
        </DialogTitle>
        <p className="text-6xl" aria-hidden>
          🔥
        </p>
        <p className="-mt-3 font-mono text-5xl font-semibold text-primary">{habit.current_streak}</p>
        <DialogDescription className="text-base text-foreground">
          <span className="block text-sm text-muted-foreground">{habit.name}</span>
          {habit.current_streak} days of showing up. Gone if you skip now. Worth it?
        </DialogDescription>
        {complete.isError && <p className="text-xs text-destructive">{complete.error.message}</p>}
        <div className="grid gap-2">
          <Button
            size="lg"
            className="h-12 font-mono tracking-[0.2em]"
            disabled={complete.isPending}
            onClick={() =>
              complete.mutate(
                { id: habit.id },
                {
                  onSuccess: () => {
                    setHabitId(null);
                    useAlfredStore.getState().say({
                      mood: "proud",
                      title: say("streakProtected", 0),
                      message: `${habit.name}: ${habit.current_streak + 1} days.`,
                    });
                  },
                },
              )
            }
          >
            {complete.isPending && <Loader2 className="animate-spin" aria-hidden />}
            PROTECT THE STREAK
          </Button>
          <Button variant="ghost" className="text-muted-foreground" onClick={close}>
            I don&apos;t care
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
