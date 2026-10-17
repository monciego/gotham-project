"use client";

import { cn } from "@gotham/ui/lib/utils";
import { useUpdateSettings } from "@/lib/settings-queries";
import type { Aggressiveness, Settings } from "@/lib/types";
import { SettingsSection } from "./settings-section";

/** In slider order. Thresholds match config/gotham.php (alfred.aggressiveness). */
export const AGGRESSIVENESS: { value: Aggressiveness; label: string; description: string }[] = [
  {
    value: "mild",
    label: "Mild",
    description: "A gentle hand. Alfred waits until noon to ask why nothing's started, and speaks up after a mission slips four times.",
  },
  {
    value: "normal",
    label: "Normal",
    description: "The butler you know. He asks at 10am, and calls out a mission postponed three times.",
  },
  {
    value: "intense",
    label: "Intense",
    description: "No quarter. He asks at 9am, and a mission is called out the second time it slips.",
  },
];

export function AlfredSection({ settings }: { settings: Settings }) {
  const update = useUpdateSettings();
  const index = AGGRESSIVENESS.findIndex((level) => level.value === settings.alfred_aggressiveness);

  return (
    <SettingsSection id="alfred" title="Alfred" description="How firmly Alfred keeps you to your word.">
      <AggressivenessSlider
        value={settings.alfred_aggressiveness}
        onChange={(value) => value !== settings.alfred_aggressiveness && update.mutate({ alfred_aggressiveness: value })}
      />
      <p className="mt-4 min-h-10 text-sm text-muted-foreground" aria-live="polite">
        {AGGRESSIVENESS[Math.max(index, 0)]!.description}
      </p>
    </SettingsSection>
  );
}

function AggressivenessSlider({ value, onChange }: { value: Aggressiveness; onChange: (value: Aggressiveness) => void }) {
  const index = Math.max(
    AGGRESSIVENESS.findIndex((level) => level.value === value),
    0,
  );

  return (
    <div className="max-w-md">
      <input
        type="range"
        min={0}
        max={AGGRESSIVENESS.length - 1}
        step={1}
        value={index}
        onChange={(event) => onChange(AGGRESSIVENESS[Number(event.target.value)]!.value)}
        aria-label="Alfred's aggressiveness"
        aria-valuetext={AGGRESSIVENESS[index]!.label}
        className="w-full accent-primary"
      />
      <div className="mt-1 grid grid-cols-3 text-xs">
        {AGGRESSIVENESS.map((level, levelIndex) => (
          <button
            key={level.value}
            type="button"
            onClick={() => onChange(level.value)}
            className={cn(
              "transition-colors duration-200",
              levelIndex === 0 ? "text-left" : levelIndex === AGGRESSIVENESS.length - 1 ? "text-right" : "text-center",
              level.value === value ? "font-medium text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {level.label}
          </button>
        ))}
      </div>
    </div>
  );
}
