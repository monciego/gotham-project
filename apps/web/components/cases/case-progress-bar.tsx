import { cn } from "@gotham/ui/lib/utils";
import { MARKS } from "./case-meta";

type CaseProgressBarProps = {
  progress: number;
  color: string;
  /** The detail page's large bar, with a tick at each of 25/50/75/100%. */
  large?: boolean;
  label: string;
};

export function CaseProgressBar({ progress, color, large, label }: CaseProgressBarProps) {
  return (
    <div className="grid gap-1.5">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cn("relative overflow-hidden rounded-full bg-secondary", large ? "h-4" : "h-1.5")}
      >
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${progress}%`, backgroundColor: color }}
        />
        {large &&
          MARKS.slice(0, -1).map((mark) => (
            <span
              key={mark}
              aria-hidden
              className="absolute inset-y-0 w-0.5 bg-background/80"
              style={{ left: `${mark}%` }}
            />
          ))}
      </div>
      {large && (
        <div className="relative h-4 font-mono text-[10px] text-muted-foreground" aria-hidden>
          {MARKS.map((mark) => (
            <span
              key={mark}
              className={cn(
                "absolute -translate-x-1/2",
                mark === 100 && "translate-x-[-100%]",
                progress >= mark && "text-primary",
              )}
              style={{ left: `${mark}%` }}
            >
              {mark}%
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
