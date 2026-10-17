"use client";

import { Button } from "@gotham/ui/components/ui/button";
import { Input } from "@gotham/ui/components/ui/input";
import { Skeleton } from "@gotham/ui/components/ui/skeleton";
import { cn } from "@gotham/ui/lib/utils";
import { ChevronLeft, ChevronRight, Loader2, Plus, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { FormAlert } from "@/components/forms/form-alert";
import { NativeSelect } from "@/components/forms/native-select";
import { formatMoney, formatMonth, parseMoney, shiftMonth } from "@/lib/money";
import { useBudgetRecommendations, useBudgets, useResourceCategories, useSaveBudgets } from "@/lib/resource-queries";
import type { BudgetMonth } from "@/lib/types";
import { useAlfredStore } from "@/stores/alfred";
import { BudgetBar } from "./budget-bar";

type Row = { category: string; limit: string };

export function BudgetPage() {
  // Empty until the API says which month is current for this user.
  const [month, setMonth] = useState("");
  const { data, isPending } = useBudgets(month);
  const shown = month || data?.month || "";

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-center gap-2">
        <Button variant="ghost" size="icon-sm" aria-label="Previous month" disabled={!shown} onClick={() => setMonth(shiftMonth(shown, -1))}>
          <ChevronLeft aria-hidden />
        </Button>
        <h3 className="min-w-40 text-center font-medium" aria-live="polite">
          {shown ? formatMonth(shown) : <Skeleton className="mx-auto h-5 w-32" />}
        </h3>
        <Button variant="ghost" size="icon-sm" aria-label="Next month" disabled={!shown} onClick={() => setMonth(shiftMonth(shown, 1))}>
          <ChevronRight aria-hidden />
        </Button>
      </div>

      {isPending || !data ? (
        <div className="grid gap-3" aria-busy>
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : (
        // Fresh edits for each month; refetches of the same month keep yours.
        <BudgetEditor key={data.month} data={data} />
      )}
    </div>
  );
}

function BudgetEditor({ data }: { data: BudgetMonth }) {
  const save = useSaveBudgets(data.month);
  const recommendations = useBudgetRecommendations(data.month);
  const { data: categories } = useResourceCategories();
  const [rows, setRows] = useState<Row[]>(() =>
    data.budgets.map((budget) => ({ category: budget.category, limit: budget.monthly_limit.toFixed(2) })),
  );
  const [dirty, setDirty] = useState(false);
  const [adding, setAdding] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const spent = new Map<string, number>([
    ...data.budgets.map((budget): [string, number] => [budget.category, budget.spent]),
    ...data.unbudgeted.map((item): [string, number] => [item.category, item.spent]),
  ]);
  const used = new Set(rows.map((row) => row.category));
  const addable = (categories?.expense ?? []).filter((category) => !used.has(category));
  const unbudgeted = data.unbudgeted.filter((item) => !used.has(item.category));
  const invalid = rows.filter((row) => !(parseMoney(row.limit) > 0)).map((row) => row.category);
  const totalLimit = rows.reduce((sum, row) => sum + (parseMoney(row.limit) || 0), 0);
  const totalSpent = rows.reduce((sum, row) => sum + (spent.get(row.category) ?? 0), 0);

  function edit(next: Row[]) {
    setRows(next);
    setDirty(true);
  }

  function add(category: string, limit = "") {
    if (!category || used.has(category)) return;
    edit([...rows, { category, limit }]);
    setAdding("");
  }

  async function recommend() {
    const { data: suggestions } = await recommendations.refetch();
    if (!suggestions?.length) {
      setNotice("Not enough history to suggest anything yet, sir. Three months of spending makes for a good start.");
      return;
    }
    const byCategory = new Map(suggestions.map((item) => [item.category, item.suggested.toFixed(2)]));
    edit([
      ...rows.map((row) => ({ ...row, limit: byCategory.get(row.category) ?? row.limit })),
      ...suggestions.filter((item) => !used.has(item.category)).map((item) => ({ category: item.category, limit: item.suggested.toFixed(2) })),
    ]);
    setNotice("Suggested from your average over the last three months. Review them, then save.");
  }

  function saveAll() {
    save.mutate(
      rows.map((row) => ({ category: row.category, monthly_limit: parseMoney(row.limit) })),
      {
        onSuccess: () => {
          setDirty(false);
          setNotice(null);
          useAlfredStore.getState().say({ mood: "encouraging", title: "Budgets saved, sir.", message: formatMonth(data.month) });
        },
      },
    );
  }

  return (
    <div className="grid gap-4">
      {data.carried_over && data.from && !dirty && (
        <FormAlert tone="success">
          These are {formatMonth(data.from)}&apos;s budgets, still in force. Save to keep them for {formatMonth(data.month)}.
        </FormAlert>
      )}
      {notice && <FormAlert tone="success">{notice}</FormAlert>}
      {save.isError && <FormAlert>{save.error.message}</FormAlert>}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
        <div>
          <p className="text-xs text-muted-foreground">Spent of budgeted</p>
          <p className="font-mono text-xl">
            {formatMoney(totalSpent)} <span className="text-muted-foreground">/ {formatMoney(totalLimit)}</span>
          </p>
        </div>
        <Button variant="outline" onClick={recommend} disabled={recommendations.isFetching}>
          {recommendations.isFetching ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
          Auto-recommend
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
          No budgets for this month, sir. Add a category below, or let Alfred recommend some.
        </p>
      ) : (
        <ul className="grid gap-3">
          {rows.map((row, index) => {
            const categorySpent = spent.get(row.category) ?? 0;
            const limit = parseMoney(row.limit);
            const percentage = limit > 0 ? Math.round((categorySpent / limit) * 100) : 0;
            const bad = invalid.includes(row.category);

            return (
              <li key={row.category} className="grid gap-3 rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="min-w-28 flex-1 font-medium">{row.category}</span>
                  <span className="text-sm text-muted-foreground">
                    Spent <span className="font-mono text-foreground">{formatMoney(categorySpent)}</span> of
                  </span>
                  <div className="relative w-32">
                    <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                    <Input
                      inputMode="decimal"
                      aria-label={`${row.category} monthly limit`}
                      aria-invalid={bad}
                      value={row.limit}
                      onChange={(event) =>
                        edit(rows.map((item, i) => (i === index ? { ...item, limit: event.target.value } : item)))
                      }
                      className="pl-6 font-mono"
                    />
                  </div>
                  <span className={cn("w-12 text-right font-mono text-sm", percentage >= 100 ? "text-red-400" : "text-muted-foreground")}>
                    {percentage}%
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${row.category} budget`}
                    onClick={() => edit(rows.filter((_, i) => i !== index))}
                    className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </div>
                <BudgetBar category={row.category} spent={categorySpent} limit={limit || 0} compact />
                {bad && <p className="text-xs text-destructive">A limit above zero, sir.</p>}
              </li>
            );
          })}
        </ul>
      )}

      {unbudgeted.length > 0 && (
        <div className="grid gap-2 rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">Spent this month without a budget:</p>
          <ul className="flex flex-wrap gap-2">
            {unbudgeted.map((item) => (
              <li key={item.category}>
                <Button variant="outline" size="sm" onClick={() => add(item.category, (Math.ceil(item.spent / 10) * 10).toFixed(2))}>
                  <Plus aria-hidden />
                  {item.category} · {formatMoney(item.spent)}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <NativeSelect aria-label="Category to budget" value={adding} onChange={(event) => setAdding(event.target.value)}>
          <option value="">Add budget for category…</option>
          {addable.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </NativeSelect>
        <Button variant="outline" size="sm" disabled={!adding} onClick={() => add(adding)}>
          <Plus aria-hidden />
          Add
        </Button>
      </div>

      <div className="sticky bottom-4 flex items-center justify-end gap-3 rounded-xl border border-border bg-card/95 p-3 backdrop-blur">
        {dirty && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
        <Button
          className="font-mono tracking-[0.15em]"
          disabled={(!dirty && !data.carried_over) || invalid.length > 0 || save.isPending}
          onClick={saveAll}
        >
          {save.isPending && <Loader2 className="animate-spin" aria-hidden />}
          SAVE ALL CHANGES
        </Button>
      </div>
    </div>
  );
}
