import type { ReactNode } from "react";

type FieldProps = {
  id: string;
  label: string;
  error?: string;
  /** Shown to the right of the label, e.g. a "Forgot password?" link. */
  action?: ReactNode;
  children: ReactNode;
};

export function Field({ id, label, error, action, children }: FieldProps) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        {action}
      </div>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
