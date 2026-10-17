"use client";

import { BracketCard } from "@gotham/ui/components/bracket-card";
import { cn } from "@gotham/ui/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { ONBOARDING_STEPS } from "@/lib/onboarding";
import type { User } from "@/lib/types";
import { HabitsStep } from "./habits-step";
import { MissionStep } from "./mission-step";
import { HoursStep, ModeStep, NotificationsStep, ReadyStep, WelcomeStep } from "./simple-steps";

/** Where the user got to, kept for a reload mid-way (the habits and mission are already saved by then). */
function storageKey(user: User) {
  return `gotham-onboarding-${user.id}`;
}

type Progress = { step: number; missionId: number | null };

function load(user: User): Progress {
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey(user)) ?? "null") as Progress | null;
    if (saved && saved.step >= 1 && saved.step <= ONBOARDING_STEPS) return saved;
  } catch {
    // Unavailable storage just means starting from the top.
  }
  return { step: 1, missionId: null };
}

/** The seven-step first run: welcome, habits, a mission, mode, work hours, notifications, ready. */
export function OnboardingFlow({ user }: { user: User }) {
  const [progress, setProgress] = useState<Progress>({ step: 1, missionId: null });
  const [direction, setDirection] = useState(1);
  const { step } = progress;

  // sessionStorage only exists in the browser, so it's read after hydration.
  useEffect(() => {
    setProgress(load(user));
  }, [user]);

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey(user), JSON.stringify(progress));
    } catch {
      // As above.
    }
  }, [user, progress]);

  function go(next: number) {
    setDirection(next > step ? 1 : -1);
    setProgress((current) => ({ ...current, step: next }));
    window.scrollTo({ top: 0 });
  }

  const next = () => go(Math.min(step + 1, ONBOARDING_STEPS));
  const back = () => go(Math.max(step - 1, 1));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <p className="font-mono text-xs tracking-[0.4em] text-primary">GOTHAM</p>
        <p className="font-mono text-xs text-muted-foreground" aria-live="polite">
          Step {step} of {ONBOARDING_STEPS}
        </p>
      </div>
      <div
        className="mb-6 grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${ONBOARDING_STEPS}, minmax(0, 1fr))` }}
        role="progressbar"
        aria-label="Setup progress"
        aria-valuemin={1}
        aria-valuemax={ONBOARDING_STEPS}
        aria-valuenow={step}
      >
        {Array.from({ length: ONBOARDING_STEPS }, (_, index) => (
          <span
            key={index}
            className={cn("h-1 rounded-full transition-colors duration-300", index < step ? "bg-primary" : "bg-border")}
          />
        ))}
      </div>

      <BracketCard className="overflow-hidden p-6 sm:p-8">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            initial={{ opacity: 0, x: 24 * direction }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 * direction }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {step === 1 && <WelcomeStep onNext={next} />}
            {step === 2 && <HabitsStep onNext={next} onBack={back} />}
            {step === 3 && (
              <MissionStep
                user={user}
                missionId={progress.missionId}
                onCreated={(missionId) => setProgress((current) => ({ ...current, missionId }))}
                onNext={next}
                onBack={back}
              />
            )}
            {step === 4 && <ModeStep user={user} onNext={next} onBack={back} />}
            {step === 5 && <HoursStep user={user} onNext={next} onBack={back} />}
            {step === 6 && <NotificationsStep user={user} onNext={next} onBack={back} />}
            {step === 7 && (
              <ReadyStep
                onBack={back}
                onDone={() => {
                  try {
                    sessionStorage.removeItem(storageKey(user));
                  } catch {
                    // As above.
                  }
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </BracketCard>
    </div>
  );
}
