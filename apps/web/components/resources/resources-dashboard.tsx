"use client";

import { Skeleton } from "@gotham/ui/components/ui/skeleton";
import { cn } from "@gotham/ui/lib/utils";
import Link from "next/link";
import { SectionCard } from "@/components/section-card";
import { formatMoney, formatMonth } from "@/lib/money";
import { useBudgets, useResourceSummary, useTransactions } from "@/lib/resource-queries";
import { BudgetBar } from "./budget-bar";
import { CategoryPie, IncomeExpenseChart } from "./finance-charts";
import { TransactionTable } from "./transaction-table";

function SummaryCards() {
  const { data } = useResourceSummary();
  const cards = [
    { label: "Total Income", value: data?.income, tone: "text-emerald-400" },
    { label: "Total Expenses", value: data?.expenses, tone: "text-red-400" },
    { label: "Net", value: data?.net, tone: (data?.net ?? 0) >= 0 ? "text-emerald-400" : "text-red-400" },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {cards.map((card) => (
        <div key={card.label} className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">
            {card.label}
            {data && <span> · {formatMonth(data.month)}</span>}
          </p>
          {card.value === undefined ? (
            <Skeleton className="mt-2 h-8 w-32" />
          ) : (
            <p className={cn("mt-1 font-mono text-2xl font-semibold md:text-3xl", card.tone)}>{formatMoney(card.value)}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function BudgetOverview() {
  const { data, isPending } = useBudgets();

  return (
    <SectionCard
      title="BUDGETS"
      action={
        <Link href="/resources/budget" className="text-xs text-muted-foreground hover:text-primary">
          Manage
        </Link>
      }
    >
      {isPending ? (
        <div className="grid gap-4" aria-busy>
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : !data || data.budgets.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No budgets yet, sir.{" "}
          <Link href="/resources/budget" className="text-primary hover:underline">
            Set some
          </Link>
          .
        </p>
      ) : (
        <div className="grid gap-4">
          {[...data.budgets]
            .sort((a, b) => (b.percentage ?? 0) - (a.percentage ?? 0))
            .map((budget) => (
              <BudgetBar key={budget.category} category={budget.category} spent={budget.spent} limit={budget.monthly_limit} />
            ))}
        </div>
      )}
    </SectionCard>
  );
}

function RecentTransactions() {
  const { data, isPending } = useTransactions({}, 1, 10);

  return (
    <SectionCard
      title="RECENT TRANSACTIONS"
      action={
        <Link href="/resources/transactions" className="text-xs text-muted-foreground hover:text-primary">
          View all
        </Link>
      }
    >
      {isPending ? (
        <div className="grid gap-2" aria-busy>
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-8" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Nothing logged yet, sir. Quick Add takes a moment.</p>
      ) : (
        <TransactionTable transactions={data.items} />
      )}
    </SectionCard>
  );
}

export function ResourcesDashboard() {
  const { data: summary, isPending } = useResourceSummary();

  return (
    <div className="grid gap-6">
      <SummaryCards />

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="INCOME VS EXPENSES · 6 MONTHS">
          {isPending || !summary ? <Skeleton className="h-64" /> : <IncomeExpenseChart history={summary.history} />}
        </SectionCard>
        <SectionCard title="WHERE IT WENT · THIS MONTH">
          {isPending || !summary ? <Skeleton className="h-64" /> : <CategoryPie categories={summary.by_category} />}
        </SectionCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <RecentTransactions />
        <BudgetOverview />
      </div>
    </div>
  );
}
