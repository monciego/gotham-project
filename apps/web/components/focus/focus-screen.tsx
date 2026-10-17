"use client";

import { Button } from "@gotham/ui/components/ui/button";
import { Skeleton } from "@gotham/ui/components/ui/skeleton";
import { cn } from "@gotham/ui/lib/utils";
import { Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { say } from "@/lib/alfred";
import {
  sessionEndsAt,
  useAbandonFocusSession,
  useCompleteFocusSession,
  useFocusSession,
} from "@/lib/focus-queries";
import { HOME } from "@/lib/routes";
import type { FocusSession } from "@/lib/types";
import { useFocusStore } from "@/stores/focus";
import { clock, pluralize } from "./clock";
import { EndEarlyDialog } from "./end-early-dialog";
import { SessionSummary } from "./session-summary";
import { useNow } from "./use-now";

/** How long the green "MISSION COMPLETE" shows before the summary. */
const CELEBRATE_MS = 2500;

export function FocusScreen({ id }: { id: number }) {
  const { data: session, isPending, isError } = useFocusSession(id);
  const complete = useCompleteFocusSession(id);
  const [celebrating, setCelebrating] = useState(false);

  useEffect(() => {
    if (!celebrating) return;
    const timer = setTimeout(() => setCelebrating(false), CELEBRATE_MS);
    return () => clearTimeout(timer);
  }, [celebrating]);

  if (isPending) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 px-4">
        <Skeleton className="h-36 w-full max-w-md bg-white/5" />
        <Skeleton className="h-5 w-56 bg-white/5" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-lg">{say("focusNotFound", 0)}</p>
        <Link href={HOME} className="text-sm text-muted-foreground hover:text-foreground">
          Back to HQ
        </Link>
      </div>
    );
  }

  if (session.end_time && !celebrating) {
    return <SessionSummary session={session} completion={complete.data ?? null} />;
  }

  return (
    <RunningSession
      session={session}
      celebrating={celebrating}
      completing={complete.isPending}
      completeError={complete.isError ? complete.error.message : null}
      onComplete={(distractions) => {
        setCelebrating(true);
        complete.mutate(distractions, { onError: () => setCelebrating(false) });
      }}
    />
  );
}

type RunningSessionProps = {
  session: FocusSession;
  celebrating: boolean;
  completing: boolean;
  completeError: string | null;
  onComplete: (distractions: number) => void;
};

function RunningSession({ session, celebrating, completing, completeError, onComplete }: RunningSessionProps) {
  const abandon = useAbandonFocusSession(session.id);
  const tracked = useFocusStore((state) => state.sessionId === session.id);
  const storedEndsAt = useFocusStore((state) => state.endsAt);
  const storedDistractions = useFocusStore((state) => state.distractions);
  const track = useFocusStore((state) => state.track);
  const addDistraction = useFocusStore((state) => state.addDistraction);
  const [confirming, setConfirming] = useState(false);
  const autoCompleted = useRef(false);

  const running = session.end_time === null;
  const now = useNow(running && !celebrating);
  const endsAt = tracked && storedEndsAt ? storedEndsAt : sessionEndsAt(session);
  const distractions = tracked ? storedDistractions : session.distractions;
  const remaining = celebrating ? 0 : Math.max(0, endsAt - now);
  const minutesWorked = Math.min(
    session.duration_minutes,
    Math.floor((now - new Date(session.start_time).getTime()) / 60_000),
  );

  // Opening the page directly (or after a reload) picks the timer back up.
  useEffect(() => {
    if (running) track(session.id, sessionEndsAt(session));
  }, [running, session, track]);

  useEffect(() => {
    if (running && remaining === 0 && !autoCompleted.current) {
      autoCompleted.current = true;
      onComplete(distractions);
    }
  }, [running, remaining, distractions, onComplete]);

  // The countdown in the tab title, for a glance from another window.
  useEffect(() => {
    const title = document.title;
    document.title = `${clock(remaining)} · Focus`;
    return () => {
      document.title = title;
    };
  }, [remaining]);

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center px-4 pb-32 text-center">
      <p
        role="timer"
        aria-label={`${clock(remaining)} remaining`}
        className={cn(
          "font-mono text-[clamp(4.5rem,22vw,11rem)] leading-none font-semibold tabular-nums transition-colors duration-300",
          celebrating
            ? "text-emerald-400 [text-shadow:0_0_48px_rgb(52_211_153/0.4)]"
            : "text-primary [text-shadow:0_0_48px_rgb(212_175_55/0.35)]",
        )}
      >
        {clock(remaining)}
      </p>

      <AnimatePresence>
        {celebrating && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 font-mono text-sm tracking-[0.4em] text-emerald-400"
            aria-live="assertive"
          >
            {say("focusTimeUp", 0)}
          </motion.p>
        )}
      </AnimatePresence>

      {session.mission && <p className="mt-8 max-w-xl text-lg text-muted-foreground">{session.mission.title}</p>}

      <ul className="mt-6 grid gap-1.5 font-mono text-xs tracking-wide text-muted-foreground">
        <li className="flex items-center justify-center gap-2">
          <span className="text-emerald-500" aria-hidden>
            ●
          </span>
          {say("focusActive", 0)}
        </li>
        <li className="flex items-center justify-center gap-2">
          <span className="text-emerald-500" aria-hidden>
            ●
          </span>
          {say("focusQuiet", 0)}
        </li>
      </ul>

      {!celebrating && remaining === 0 && (
        <div className="mt-8 grid justify-items-center gap-2 text-sm" aria-live="polite">
          {completing && <p className="text-muted-foreground">Recording your session…</p>}
          {completeError && (
            <>
              <p className="text-destructive">{completeError}</p>
              <Button variant="outline" onClick={() => onComplete(distractions)}>
                Try again
              </Button>
            </>
          )}
        </div>
      )}

      {!celebrating && (
        <div className="fixed inset-x-0 bottom-0 grid grid-cols-[1fr_auto_1fr] items-end gap-2 p-4 md:p-8">
          <div className="grid justify-items-start gap-1">
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={addDistraction}>
              <Plus aria-hidden />
              Distraction
            </Button>
            <p className="px-2.5 font-mono text-xs text-muted-foreground" aria-live="polite">
              {pluralize(distractions, "distraction")}
            </p>
          </div>

          <Button
            variant="ghost"
            className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
            onClick={() => setConfirming(true)}
          >
            End Early
          </Button>
        </div>
      )}

      <EndEarlyDialog
        open={confirming}
        onOpenChange={setConfirming}
        minutesWorked={Math.max(0, minutesWorked)}
        ending={abandon.isPending}
        error={abandon.isError ? abandon.error.message : null}
        onEnd={() => abandon.mutate(distractions, { onSuccess: () => setConfirming(false) })}
      />
    </div>
  );
}
