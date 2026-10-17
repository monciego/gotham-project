"use client";

import { Button } from "@gotham/ui/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@gotham/ui/components/ui/dialog";
import { cn } from "@gotham/ui/lib/utils";
import { Timer } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { say } from "@/lib/alfred";
import { useStartFocusSession } from "@/lib/focus-queries";
import type { MissionDetail } from "@/lib/types";

/**
 * Three two-minute steps: open what you need, then the mission's first open
 * subtasks, or generic first moves when there aren't any.
 */
function stepsFor(mission: MissionDetail): string[] {
  const subtasks = mission.subtasks
    .filter((subtask) => !subtask.completed && subtask.id > 0)
    .map((subtask) => subtask.title);
  const fallback = ["Write down the very first thing to do", "Do that one thing. Nothing more."];

  return ["Just open what you need for this", ...subtasks, ...fallback].slice(0, 3);
}

type BreakdownDialogProps = {
  mission: MissionDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function BreakdownDialog({ mission, open, onOpenChange }: BreakdownDialogProps) {
  const [step, setStep] = useState(0);
  const router = useRouter();
  const start = useStartFocusSession();
  const [navigating, startTransition] = useTransition();
  const steps = stepsFor(mission);
  const finished = step >= steps.length;

  function changeOpen(next: boolean) {
    if (next) setStep(0);
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="gap-6 p-6 text-center sm:max-w-md">
        <DialogTitle className="font-mono text-xs font-normal tracking-[0.3em] text-primary">
          {finished ? "MOMENTUM" : `STEP ${step + 1} OF ${steps.length}`}
        </DialogTitle>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.2 }}
            className="grid gap-3"
          >
            {finished ? (
              <p className="text-xl leading-snug font-semibold">{say("breakdownDone", 0)}</p>
            ) : (
              <>
                {step === 0 && <p className="text-sm text-muted-foreground">{say("breakdownIntro", 0)}</p>}
                <p className="text-2xl leading-snug font-semibold">→ {steps[step]}</p>
                <p className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
                  <Timer className="size-4" aria-hidden />2 minutes
                </p>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {finished ? (
          <div className="grid gap-2">
            <Button
              size="lg"
              className="h-12 w-full font-mono tracking-[0.2em]"
              disabled={start.isPending || navigating}
              onClick={() =>
                start.mutate(
                  { missionId: mission.id },
                  { onSuccess: (session) => startTransition(() => router.push(`/focus/${session.id}`)) },
                )
              }
            >
              YES, START NOW
            </Button>
            {start.isError && <p className="text-xs text-destructive">{start.error.message}</p>}
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Not yet
            </Button>
          </div>
        ) : (
          <Button
            size="lg"
            className="h-12 w-full bg-emerald-600 font-mono tracking-[0.2em] text-white hover:bg-emerald-500"
            onClick={() => setStep(step + 1)}
          >
            I CAN DO THAT
          </Button>
        )}

        <div className="flex justify-center gap-2" aria-hidden>
          {steps.map((_, index) => (
            <span
              key={index}
              className={cn(
                "size-2 rounded-full transition-colors duration-200",
                index < step ? "bg-emerald-500" : index === step ? "bg-primary" : "bg-muted",
              )}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
