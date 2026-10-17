"use client";

import { Button } from "@gotham/ui/components/ui/button";
import { Coffee, Loader2, Play, Trophy } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { say } from "@/lib/alfred";
import { useStartFocusSession } from "@/lib/focus-queries";
import { HOME } from "@/lib/routes";
import type { FocusCompletion, FocusSession } from "@/lib/types";
import { clock, pluralize } from "./clock";
import { EnergyRating } from "./energy-rating";
import { useNow } from "./use-now";

const BREAK_MS = 5 * 60_000;

type SessionSummaryProps = {
  session: FocusSession;
  /** Only there right after completing; level-ups and trophies come from it. */
  completion: FocusCompletion | null;
};

/** After a session: what it achieved, energy, then a break or another round. */
export function SessionSummary({ session, completion }: SessionSummaryProps) {
  const router = useRouter();
  const start = useStartFocusSession();
  const [navigating, startTransition] = useTransition();
  const [breakEndsAt, setBreakEndsAt] = useState<number | null>(null);
  const now = useNow(breakEndsAt !== null);

  const xp = completion?.xp_awarded ?? session.xp_awarded;
  const mission = session.mission;
  const missionOpen = mission?.status === "not_started" || mission?.status === "in_progress";
  // `now` can lag by up to a second when the break starts, so cap it at 5:00.
  const breakLeft = breakEndsAt === null ? null : Math.min(BREAK_MS, Math.max(0, breakEndsAt - now));

  function startAnother() {
    start.mutate(
      { missionId: missionOpen && mission ? mission.id : null },
      { onSuccess: (next) => startTransition(() => router.replace(`/focus/${next.id}`)) },
    );
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-10 px-4 py-12 text-center">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="grid justify-items-center gap-3"
      >
        <h1 className="font-mono text-sm tracking-[0.4em] text-primary">
          {session.completed ? "SESSION COMPLETE" : "SESSION ENDED"}
        </h1>
        <p className="text-3xl font-semibold tracking-tight md:text-4xl">
          {pluralize(session.duration_minutes, "minute")} of focused work
        </p>
        {mission && <p className="text-muted-foreground">{mission.title}</p>}
        <p className="mt-2 max-w-md text-lg italic">
          &ldquo;{say(session.completed ? "focusComplete" : "focusStopped", 0)}&rdquo;
        </p>
      </motion.div>

      {session.completed && (
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.2, type: "spring", bounce: 0.4 }}
          className="grid justify-items-center gap-2"
        >
          <p className="font-mono text-5xl font-semibold text-primary [text-shadow:0_0_32px_rgb(212_175_55/0.35)]">
            +{xp} XP
          </p>
          {xp === 0 && <p className="text-xs text-muted-foreground">XP comes with every full 25 minutes, sir.</p>}
          {completion?.level_up && (
            <p className="font-mono text-sm tracking-[0.2em] text-primary">LEVEL {completion.current_level}</p>
          )}
          {completion?.achievements.map((trophy) => (
            <p key={trophy.key} className="flex items-center gap-1.5 text-sm">
              <Trophy className="size-4 text-primary" aria-hidden />
              Trophy earned: {trophy.name}
            </p>
          ))}
        </motion.div>
      )}

      <EnergyRating sessionId={session.id} value={session.energy_after} />

      <div className="grid w-full max-w-sm gap-3">
        {breakLeft !== null && (
          <div className="grid justify-items-center gap-1" aria-live="polite">
            <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground">BREAK</p>
            <p className="font-mono text-4xl tabular-nums">{clock(breakLeft)}</p>
            {breakLeft === 0 && <p className="text-sm text-primary">{say("breakOver", 0)}</p>}
          </div>
        )}
        {breakLeft === null && (
          <Button variant="outline" size="lg" className="h-11" onClick={() => setBreakEndsAt(Date.now() + BREAK_MS)}>
            <Coffee aria-hidden />
            Take 5 Min Break
          </Button>
        )}
        <Button size="lg" className="h-11" disabled={start.isPending || navigating} onClick={startAnother}>
          {start.isPending || navigating ? <Loader2 className="animate-spin" aria-hidden /> : <Play aria-hidden />}
          Start Another Session
        </Button>
        {start.isError && <p className="text-xs text-destructive">{start.error.message}</p>}
      </div>

      <div className="flex gap-6 text-sm text-muted-foreground">
        {mission && (
          <Link href={`/missions/${mission.id}`} className="hover:text-foreground">
            Back to mission
          </Link>
        )}
        <Link href={HOME} className="hover:text-foreground">
          Back to HQ
        </Link>
      </div>
    </div>
  );
}
