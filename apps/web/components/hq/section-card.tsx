import { cn } from "@gotham/ui/lib/utils";

type SectionCardProps = {
  title: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
};

export function SectionCard({ title, action, className, children }: SectionCardProps) {
  return (
    <section className={cn("rounded-xl border border-border bg-card p-5", className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-mono text-xs font-semibold tracking-[0.2em] text-muted-foreground">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}
