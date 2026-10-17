import { cn } from "@gotham/ui/lib/utils";
import type { UseFormRegisterReturn } from "react-hook-form";

type ChoicePillsProps = {
  name: string;
  legend: string;
  options: { value: string; label: string; dot?: string }[];
  registration: UseFormRegisterReturn;
  error?: string;
};

/** A radio group drawn as pills, for short choices like priority and energy. */
export function ChoicePills({ name, legend, options, registration, error }: ChoicePillsProps) {
  return (
    <fieldset className="grid gap-1.5">
      <legend className="mb-1.5 text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label key={option.value} className="cursor-pointer">
            <input type="radio" value={option.value} className="peer sr-only" {...registration} />
            <span
              className={cn(
                "flex h-8 items-center gap-2 rounded-lg border border-input px-3 text-sm text-muted-foreground transition-colors duration-200",
                "peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-foreground",
                "peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 hover:text-foreground",
              )}
            >
              {option.dot && <span aria-hidden className={cn("size-2 rounded-full", option.dot)} />}
              {option.label}
            </span>
          </label>
        ))}
      </div>
      {error && (
        <p id={`${name}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}
