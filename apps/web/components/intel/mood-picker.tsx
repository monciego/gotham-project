import { cn } from "@gotham/ui/lib/utils";
import type { IntelMood } from "@/lib/types";
import { MOODS } from "./moods";

type MoodPickerProps = {
  value: IntelMood | undefined;
  onChange: (mood: IntelMood) => void;
  error?: string;
};

export function MoodPicker({ value, onChange, error }: MoodPickerProps) {
  return (
    <fieldset className="grid gap-2" aria-describedby={error ? "mood-error" : undefined}>
      <legend className="mb-1 text-sm font-medium">How was the day?</legend>
      <div role="radiogroup" className="grid grid-cols-5 gap-2">
        {MOODS.map((mood) => {
          const selected = value === mood.value;
          return (
            <button
              key={mood.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(mood.value)}
              className={cn(
                "grid justify-items-center gap-1 rounded-xl border-2 px-1 py-3 transition-colors duration-200",
                selected ? "bg-card" : "border-border hover:border-muted-foreground/50",
              )}
              style={selected ? { borderColor: mood.color, backgroundColor: `${mood.color}1a` } : undefined}
            >
              <span className="text-3xl sm:text-4xl" aria-hidden>
                {mood.emoji}
              </span>
              <span className={cn("text-xs", selected ? "text-foreground" : "text-muted-foreground")}>{mood.label}</span>
            </button>
          );
        })}
      </div>
      {error && (
        <p id="mood-error" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}
