import { cn } from "@gotham/ui/lib/utils";

type SettingsSectionProps = {
  id: string;
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
};

/** One block of the settings page; `id` makes it linkable (/settings#profile). */
export function SettingsSection({ id, title, description, className, children }: SettingsSectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn("scroll-mt-24 rounded-xl border border-border bg-card p-5 md:p-6", className)}
    >
      <h2 id={`${id}-title`} className="font-mono text-xs font-semibold tracking-[0.2em] text-muted-foreground">
        {title.toUpperCase()}
      </h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** A label and description on the left, its control on the right. */
export function SettingRow({
  htmlFor,
  label,
  description,
  children,
}: {
  htmlFor: string;
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
        </label>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}

/** "Saved" / an error, beside a section's save button. */
export function SaveStatus({ status }: { status: { tone: "success" | "error"; text: string } | null }) {
  if (!status) return null;

  return (
    <p
      role={status.tone === "error" ? "alert" : "status"}
      className={cn("text-sm", status.tone === "error" ? "text-destructive" : "text-muted-foreground")}
    >
      {status.text}
    </p>
  );
}
