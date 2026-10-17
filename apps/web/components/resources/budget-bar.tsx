import { cn } from "@gotham/ui/lib/utils";
import { formatMoney } from "@/lib/money";

/** Green under 80%, amber to 99%, red from 100%. */
export function budgetTone(percentage: number): string {
  return percentage >= 100 ? "bg-red-500" : percentage >= 80 ? "bg-amber-500" : "bg-emerald-500";
}

type BudgetBarProps = {
  category: string;
  spent: number;
  limit: number;
  /** Hide the "Spent $X of $Y" line, e.g. where an input shows the limit. */
  compact?: boolean;
};

export function BudgetBar({ category, spent, limit, compact }: BudgetBarProps) {
  const percentage = limit > 0 ? Math.round((spent / limit) * 100) : 0;

  return (
    <div className="grid gap-1.5">
      {!compact && (
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="font-medium">{category}</span>
          <span className={cn("font-mono text-xs", percentage >= 100 ? "text-red-400" : "text-muted-foreground")}>
            {percentage}%
          </span>
        </div>
      )}
      <div
        className="h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label={`${category} budget used`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(100, percentage)}
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-300", budgetTone(percentage))}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
      {!compact && (
        <p className="text-xs text-muted-foreground">
          Spent <span className="font-mono text-foreground">{formatMoney(spent)}</span> of {formatMoney(limit)} budget
        </p>
      )}
    </div>
  );
}
