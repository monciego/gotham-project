/** The Gotham chart theme: transparent background, theme grid and muted text, gold first. */
export const GOLD = "#d4af37";
export const GRID = "var(--border)";
export const TEXT = "var(--muted-foreground)";
export const PURPLE = "#8b5cf6";
export const BLUE = "#3b82f6";

export const axis = { stroke: TEXT, fontSize: 11, tickLine: false, axisLine: false } as const;

export const cursor = { fill: "color-mix(in oklch, var(--foreground) 5%, transparent)", stroke: GRID };

const SHORT_DATE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** "Oct 17", from Y-m-d without a timezone shift. */
export function shortDate(date: string): string {
  return SHORT_DATE.format(new Date(`${date}T00:00:00Z`));
}

/** Recharts' tooltip box in the Gotham style, with lines given by the chart. */
export function ChartTooltip({ active, lines }: { active?: boolean; lines: string[] | null }) {
  if (!active || !lines) return null;

  return (
    <div className="rounded-lg border border-border bg-popover px-2.5 py-1.5 text-xs shadow-lg">
      {lines.map((line, index) => (
        <p key={line} className={index === 0 ? "text-foreground" : "text-muted-foreground"}>
          {line}
        </p>
      ))}
    </div>
  );
}

/** For a chart's data area when there's nothing to draw. */
export function EmptyChart({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid h-56 place-items-center rounded-lg border border-dashed border-border px-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
