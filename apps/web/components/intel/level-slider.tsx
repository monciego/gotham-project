import type { UseFormRegisterReturn } from "react-hook-form";
import { levelWord } from "./moods";

type LevelSliderProps = {
  id: string;
  label: string;
  value: number;
  registration: UseFormRegisterReturn;
};

/** A 1–10 slider with its value and a word for it. */
export function LevelSlider({ id, label, value, registration }: LevelSliderProps) {
  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <span className="font-mono text-sm">
          <span className="text-primary">{value}</span>
          <span className="text-muted-foreground"> / 10 · {levelWord(value)}</span>
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={1}
        max={10}
        step={1}
        aria-valuetext={`${value} out of 10, ${levelWord(value).toLowerCase()}`}
        className="h-2 w-full cursor-pointer accent-primary"
        {...registration}
      />
      <div className="flex justify-between font-mono text-[10px] text-muted-foreground" aria-hidden>
        <span>1</span>
        <span>10</span>
      </div>
    </div>
  );
}
