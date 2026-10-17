"use client";

import { cn } from "@gotham/ui/lib/utils";
import { Pencil, Repeat } from "lucide-react";
import { formatDay, formatMoney } from "@/lib/money";
import type { Transaction } from "@/lib/types";

type TransactionTableProps = {
  transactions: Transaction[];
  /** Checkbox column for bulk actions. */
  selected?: Set<number>;
  onSelectedChange?: (selected: Set<number>) => void;
  onEdit?: (transaction: Transaction) => void;
};

export function TransactionTable({ transactions, selected, onSelectedChange, onEdit }: TransactionTableProps) {
  const selectable = selected !== undefined && onSelectedChange !== undefined;
  const allSelected = selectable && transactions.length > 0 && transactions.every((item) => selected.has(item.id));

  function toggle(id: number) {
    if (!selectable) return;
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectedChange(next);
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            {selectable && (
              <th className="w-8 py-2 pr-2 font-normal">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  aria-label="Select all on this page"
                  checked={allSelected}
                  onChange={() => onSelectedChange(allSelected ? new Set() : new Set(transactions.map((item) => item.id)))}
                />
              </th>
            )}
            <th className="py-2 pr-3 font-normal">Date</th>
            <th className="py-2 pr-3 font-normal">Description</th>
            <th className="py-2 pr-3 font-normal">Category</th>
            <th className="py-2 pr-3 font-normal">Account</th>
            <th className="py-2 text-right font-normal">Amount</th>
            {onEdit && (
              <th className="w-8 py-2 font-normal">
                <span className="sr-only">Edit</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {transactions.map((transaction) => (
            <tr key={transaction.id} className={cn(selectable && selected.has(transaction.id) && "bg-primary/5")}>
              {selectable && (
                <td className="py-2.5 pr-2">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    aria-label={`Select ${transaction.description ?? transaction.category}`}
                    checked={selected.has(transaction.id)}
                    onChange={() => toggle(transaction.id)}
                  />
                </td>
              )}
              <td className="py-2.5 pr-3 whitespace-nowrap text-muted-foreground">{formatDay(transaction.date)}</td>
              <td className="py-2.5 pr-3">
                <span className="flex items-center gap-1.5">
                  {transaction.description ?? <span className="text-muted-foreground">—</span>}
                  {transaction.recurring && (
                    <Repeat className="size-3.5 text-muted-foreground" aria-label={`Repeats ${transaction.recurring_frequency}`} />
                  )}
                </span>
              </td>
              <td className="py-2.5 pr-3">{transaction.category}</td>
              <td className="py-2.5 pr-3 text-muted-foreground">{transaction.account ?? "—"}</td>
              <td
                className={cn(
                  "py-2.5 text-right font-mono whitespace-nowrap",
                  transaction.type === "income" ? "text-emerald-400" : "text-red-400",
                )}
              >
                {transaction.type === "income" ? "+" : "−"}
                {formatMoney(transaction.amount)}
              </td>
              {onEdit && (
                <td className="py-2.5 pl-2">
                  <button
                    type="button"
                    aria-label={`Edit ${transaction.description ?? transaction.category}`}
                    onClick={() => onEdit(transaction)}
                    className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <Pencil className="size-3.5" aria-hidden />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
