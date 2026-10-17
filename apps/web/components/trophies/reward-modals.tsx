"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { celebrate, fireworks } from "@/lib/celebrate";
import { useMe } from "@/lib/queries";
import type { Celebration } from "@/stores/rewards";
import { CountUp } from "./count-up";
import { RARITY, trophyIcon } from "./trophy-icons";

const SHOW_FOR_MS = { trophy: 4000, level: 5000 };

type ModalProps = { celebration: Celebration; onDone: () => void };

/** Trophy unlocks and level-ups, one at a time. Click anywhere or wait to dismiss. */
export function RewardModal({ celebration, onDone }: ModalProps) {
  useEffect(() => {
    void (celebration.kind === "level" ? fireworks() : celebrate());
    const timer = setTimeout(onDone, SHOW_FOR_MS[celebration.kind]);
    return () => clearTimeout(timer);
  }, [celebration, onDone]);

  return (
    <motion.div
      key={celebration.key}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={`${celebration.key}-title`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={onDone}
      className="fixed inset-0 z-[60] grid cursor-pointer place-items-center bg-background/80 p-6 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="grid max-w-md justify-items-center gap-3 text-center"
      >
        {celebration.kind === "trophy" ? <TrophyBody celebration={celebration} /> : <LevelBody level={celebration.level} id={celebration.key} />}
        <p className="mt-4 text-xs text-muted-foreground">Click anywhere to continue</p>
      </motion.div>
    </motion.div>
  );
}

function TrophyBody({ celebration }: { celebration: Extract<Celebration, { kind: "trophy" }> }) {
  const { trophy } = celebration;
  const Icon = trophyIcon(trophy.icon);

  return (
    <>
      <span className="trophy-glow grid size-24 place-items-center rounded-full border-2 border-primary/70 bg-primary/10">
        <Icon className="size-11 text-primary" aria-hidden />
      </span>
      <p className="mt-2 font-mono text-xs tracking-[0.3em] text-primary">TROPHY EARNED</p>
      <h2 id={`${celebration.key}-title`} className="text-3xl font-semibold tracking-tight">
        {trophy.name}
      </h2>
      <p className="text-muted-foreground">{trophy.description}</p>
      <p className={`text-xs ${RARITY[trophy.rarity].text}`}>{RARITY[trophy.rarity].label}</p>
      <p className="font-mono text-3xl font-semibold text-primary">
        +<CountUp value={trophy.xp_reward} /> XP
      </p>
      <p className="mt-2 text-sm italic text-muted-foreground">&ldquo;Well earned, sir.&rdquo; — Alfred</p>
    </>
  );
}

function LevelBody({ level, id }: { level: number; id: string }) {
  const { data: user } = useMe();

  return (
    <>
      <h2 id={`${id}-title`} className="font-mono text-sm tracking-[0.4em] text-primary">
        LEVEL UP
      </h2>
      <motion.span
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 180, damping: 12 }}
        className="trophy-glow font-mono text-[9rem] leading-none font-semibold text-primary"
      >
        {level}
      </motion.span>
      <p className="text-lg">
        {user?.name ?? "Bruce Wayne"} — Level {level}
      </p>
      <p className="mt-2 text-sm italic text-muted-foreground">
        &ldquo;You&apos;re becoming who you need to be, sir.&rdquo; — Alfred
      </p>
    </>
  );
}

export function RewardModals({ queue, onDone }: { queue: Celebration[]; onDone: () => void }) {
  const current = queue[0];

  return <AnimatePresence mode="wait">{current && <RewardModal key={current.key} celebration={current} onDone={onDone} />}</AnimatePresence>;
}
