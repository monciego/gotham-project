"use client";

import { cn } from "@gotham/ui/lib/utils";
import { Check } from "lucide-react";
import { MODE_ORDER, MODES } from "@/lib/modes";
import type { Mode } from "@/lib/types";

type ModeCardsProps = {
  value: Mode;
  onChange: (mode: Mode) => void;
  /** Also lists what changes in each mode. */
  detailed?: boolean;
  className?: string;
};

/** The five modes as selectable cards (the mode switcher, onboarding and settings). */
export function ModeCards({ value, onChange, detailed = false, className }: ModeCardsProps) {
  return (
    <div role="radiogroup" aria-label="Life mode" className={cn("grid gap-3 sm:grid-cols-2", className)}>
      {MODE_ORDER.map((mode) => {
        const { label, color, icon: Icon, description, changes } = MODES[mode];
        const selected = mode === value;

        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(mode)}
            style={{ "--mode": color } as React.CSSProperties}
            className={cn(
              "relative rounded-xl border p-4 text-left transition-colors duration-200 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              selected
                ? "border-(--mode) bg-[color-mix(in_oklch,var(--mode)_10%,transparent)]"
                : "border-border hover:bg-accent",
              // Five cards: the last spans both columns.
              mode === "rest" && "sm:col-span-2",
            )}
          >
            <span className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-[color-mix(in_oklch,var(--mode)_18%,transparent)] text-(--mode)">
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="font-medium">{label}</span>
              {selected && <Check className="ml-auto size-4 text-(--mode)" aria-hidden />}
            </span>
            <span className="mt-2 block text-sm text-muted-foreground">{description}</span>
            {detailed && (
              <ul className="mt-2 grid gap-0.5 text-xs text-muted-foreground">
                {changes.map((change) => (
                  <li key={change} className="flex gap-1.5">
                    <span aria-hidden className="text-(--mode)">
                      ·
                    </span>
                    {change}
                  </li>
                ))}
              </ul>
            )}
          </button>
        );
      })}
    </div>
  );
}
