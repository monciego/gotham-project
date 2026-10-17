import { cn } from "@gotham/ui/lib/utils";
import { levelWord } from "./moods";

/** Ten segments, lit up to the level. */
export function LevelMeter({ label, level, tone }: { label: string; level: number; tone: "energy" | "stress" }) {
  return (
    <div className="grid gap-2 rounded-xl border border-border bg-card p-4">
      <p className="flex items-baseline justify-between text-xs text-muted-foreground">
        {label}
        <span className="font-mono text-sm text-foreground">
          {level}/10 <span className="text-muted-foreground">· {levelWord(level)}</span>
        </span>
      </p>
      <div className="flex gap-1" role="meter" aria-label={label} aria-valuemin={1} aria-valuemax={10} aria-valuenow={level}>
        {Array.from({ length: 10 }, (_, index) => (
          <span
            key={index}
            className={cn(
              "h-2 flex-1 rounded-full",
              index < level ? (tone === "energy" ? "bg-primary" : "bg-priority-high") : "bg-muted",
            )}
          />
        ))}
      </div>
    </div>
  );
}
