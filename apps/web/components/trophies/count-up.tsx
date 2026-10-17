"use client";

import { animate, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

/** Counts from 0 to `value` once, unless the user prefers reduced motion. */
export function CountUp({ value, duration = 1 }: { value: number; duration?: number }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(reduced ? value : 0);

  useEffect(() => {
    if (reduced) return;
    const controls = animate(0, value, { duration, ease: "easeOut", onUpdate: (latest) => setShown(Math.round(latest)) });
    return () => controls.stop();
  }, [value, duration, reduced]);

  return <>{(reduced ? value : shown).toLocaleString("en-US")}</>;
}
