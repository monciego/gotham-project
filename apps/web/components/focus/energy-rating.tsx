"use client";

import { cn } from "@gotham/ui/lib/utils";
import { say } from "@/lib/alfred";
import { useRateEnergy } from "@/lib/focus-queries";

const LEVELS = Array.from({ length: 10 }, (_, index) => index + 1);

export function EnergyRating({ sessionId, value }: { sessionId: number; value: number | null }) {
  const rate = useRateEnergy(sessionId);

  return (
    <div className="grid justify-items-center gap-3">
      <p id="energy-label" className="text-sm text-muted-foreground">
        How do you feel now?
      </p>
      <div role="radiogroup" aria-labelledby="energy-label" className="grid grid-cols-5 gap-2 sm:grid-cols-10">
        {LEVELS.map((level) => (
          <button
            key={level}
            type="button"
            role="radio"
            aria-checked={value === level}
            aria-label={`${level} out of 10`}
            onClick={() => rate.mutate(level)}
            className={cn(
              "size-10 rounded-lg border font-mono text-sm transition-colors duration-200",
              value === level
                ? "border-primary bg-primary/15 text-primary"
                : "border-input text-muted-foreground hover:border-primary/60 hover:text-foreground",
            )}
          >
            {level}
          </button>
        ))}
      </div>
      <p className="h-4 text-xs text-muted-foreground" aria-live="polite">
        {rate.isError ? <span className="text-destructive">{rate.error.message}</span> : value && say("energyThanks", 0)}
      </p>
    </div>
  );
}
