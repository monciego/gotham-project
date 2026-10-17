import { cn } from "@gotham/ui/lib/utils";

type TogglePillsProps<T extends string | number> = {
  legend: string;
  hint?: string;
  options: { value: T; label: string }[];
  value: T[];
  onChange: (value: T[]) => void;
  error?: string;
  id: string;
};

/** A checkbox group drawn as pills, for picking several short options (days, modes). */
export function TogglePills<T extends string | number>({
  legend,
  hint,
  options,
  value,
  onChange,
  error,
  id,
}: TogglePillsProps<T>) {
  function toggle(option: T) {
    onChange(value.includes(option) ? value.filter((item) => item !== option) : [...value, option]);
  }

  return (
    <fieldset className="grid gap-1.5" aria-describedby={error ? `${id}-error` : undefined}>
      <legend className="mb-1.5 text-sm font-medium">{legend}</legend>
      {hint && <p className="-mt-1 mb-1 text-xs text-muted-foreground">{hint}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label key={option.value} className="cursor-pointer">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={value.includes(option.value)}
              onChange={() => toggle(option.value)}
            />
            <span
              className={cn(
                "flex h-8 items-center rounded-lg border border-input px-3 text-sm text-muted-foreground transition-colors duration-200",
                "peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-foreground",
                "peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 hover:text-foreground",
              )}
            >
              {option.label}
            </span>
          </label>
        ))}
      </div>
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}
