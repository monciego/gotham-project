import { cn } from "@gotham/ui/lib/utils";

type SwitchProps = {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** The accessible name, when no <label htmlFor> points at the switch. */
  label?: string;
  className?: string;
};

/** An on/off toggle (role="switch"). */
export function Switch({ id, checked, onChange, disabled, label, className }: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent transition-colors duration-200 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50",
        checked ? "bg-primary" : "bg-input",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-4 rounded-full bg-background shadow-sm transition-transform duration-200",
          checked ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
