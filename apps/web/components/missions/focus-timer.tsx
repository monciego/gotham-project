"use client";

import { BracketCard } from "@gotham/ui/components/bracket-card";
import { Button } from "@gotham/ui/components/ui/button";
import { cn } from "@gotham/ui/lib/utils";
import { useEffect, useState } from "react";
import { useEndSession } from "@/lib/mission-queries";
import type { FocusSession } from "@/lib/types";

function clock(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

/** The running session's countdown. When it's done, asks for energy and logs it. */
export function FocusTimer({ missionId, session }: { missionId: number; session: FocusSession }) {
  const end = useEndSession(missionId);
  const [now, setNow] = useState(() => Date.now());
  const [energy, setEnergy] = useState<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const total = session.duration_minutes * 60_000;
  const remaining = Math.max(0, new Date(session.start_time).getTime() + total - now);
  const done = remaining === 0;

  return (
    <BracketCard className="p-6" aria-live="polite">
      <p className="font-mono text-xs tracking-[0.3em] text-primary">
        {done ? "SESSION COMPLETE" : "FOCUS SESSION"}
      </p>
      <p className="mt-2 font-mono text-5xl font-semibold tabular-nums">{clock(remaining)}</p>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div
          className="h-full bg-primary transition-[width] duration-1000 ease-linear"
          style={{ width: `${((total - remaining) / total) * 100}%` }}
        />
      </div>

      {done ? (
        <div className="mt-5 grid gap-3">
          <p className="text-sm text-muted-foreground">Time&apos;s up, sir. How&apos;s your energy now?</p>
          <div role="radiogroup" aria-label="Energy, 1 to 5" className="flex gap-2">
            {[1, 2, 3, 4, 5].map((level) => (
              <button
                key={level}
                type="button"
                role="radio"
                aria-checked={energy === level}
                onClick={() => setEnergy(level)}
                className={cn(
                  "size-9 rounded-lg border font-mono text-sm transition-colors duration-200",
                  energy === level ? "border-primary bg-primary/15 text-primary" : "border-input hover:border-primary/60",
                )}
              >
                {level}
              </button>
            ))}
          </div>
          <Button
            className="w-full sm:w-auto"
            disabled={end.isPending}
            onClick={() => end.mutate({ sessionId: session.id, completed: true, energy_after: energy })}
          >
            Log session
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          className="mt-5"
          disabled={end.isPending}
          onClick={() => end.mutate({ sessionId: session.id, completed: false })}
        >
          Stop early
        </Button>
      )}
    </BracketCard>
  );
}
