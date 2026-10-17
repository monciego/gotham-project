"use client";

import { Button } from "@gotham/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@gotham/ui/components/ui/dialog";
import { Input } from "@gotham/ui/components/ui/input";
import { Skeleton } from "@gotham/ui/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Download, Loader2, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { NativeSelect } from "@/components/forms/native-select";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  exportTransactions,
  type TransactionFilters,
  useDeleteTransactions,
  useResourceCategories,
  useTransactions,
} from "@/lib/resource-queries";
import type { Transaction, TransactionType } from "@/lib/types";
import { TransactionDialog } from "./transaction-dialog";
import { TransactionTable } from "./transaction-table";

const SORTS = {
  newest: { sort: "date", direction: "desc", label: "Newest first" },
  oldest: { sort: "date", direction: "asc", label: "Oldest first" },
  largest: { sort: "amount", direction: "desc", label: "Largest first" },
  smallest: { sort: "amount", direction: "asc", label: "Smallest first" },
} as const;

type SortKey = keyof typeof SORTS;

export function TransactionsPage() {
  const [type, setType] = useState<TransactionType | "">("");
  const [category, setCategory] = useState("");
  const [account, setAccount] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [exporting, setExporting] = useState(false);

  const filters: TransactionFilters = {
    type,
    category,
    account: useDebouncedValue(account.trim(), 300),
    from,
    to,
    search: useDebouncedValue(search.trim(), 300),
    sort: SORTS[sort].sort,
    direction: SORTS[sort].direction,
  };
  const { data, isPending, isPlaceholderData } = useTransactions(filters, page);
  const { data: categories } = useResourceCategories();
  const remove = useDeleteTransactions();
  const allCategories = [...new Set([...(categories?.expense ?? []), ...(categories?.income ?? [])])].sort();

  /** Any filter change starts again from page 1 with nothing selected. */
  function change<T>(set: (value: T) => void) {
    return (value: T) => {
      set(value);
      setPage(1);
      setSelected(new Set());
    };
  }

  async function download() {
    setExporting(true);
    try {
      await exportTransactions(filters);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-2 rounded-xl border border-border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-48 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              type="search"
              value={search}
              onChange={(event) => change(setSearch)(event.target.value)}
              placeholder="Search descriptions and categories"
              aria-label="Search transactions"
              className="pl-8"
            />
          </div>
          <NativeSelect aria-label="Sort" value={sort} onChange={(event) => change(setSort)(event.target.value as SortKey)}>
            {Object.entries(SORTS).map(([key, option]) => (
              <option key={key} value={key}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <NativeSelect aria-label="Type" value={type} onChange={(event) => change(setType)(event.target.value as TransactionType | "")}>
            <option value="">Income and expenses</option>
            <option value="income">Income</option>
            <option value="expense">Expenses</option>
          </NativeSelect>
          <NativeSelect aria-label="Category" value={category} onChange={(event) => change(setCategory)(event.target.value)}>
            <option value="">Any category</option>
            {allCategories.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </NativeSelect>
          <Input
            value={account}
            onChange={(event) => change(setAccount)(event.target.value)}
            placeholder="Account"
            aria-label="Account"
            className="w-32"
          />
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            From
            <Input type="date" value={from} onChange={(event) => change(setFrom)(event.target.value)} className="w-36" />
          </label>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            To
            <Input type="date" value={to} onChange={(event) => change(setTo)(event.target.value)} className="w-36" />
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {selected.size > 0 ? `${selected.size} selected` : data ? `${data.meta.total} transactions` : ""}
        </p>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <Button variant="destructive" size="sm" onClick={() => setConfirming(true)}>
              <Trash2 aria-hidden />
              Delete selected
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={download} disabled={exporting}>
            {exporting ? <Loader2 className="animate-spin" aria-hidden /> : <Download aria-hidden />}
            Export CSV
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card px-4 py-2">
        {isPending ? (
          <div className="grid gap-2 py-2" aria-busy>
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton key={index} className="h-8" />
            ))}
          </div>
        ) : !data || data.items.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No transactions match, sir.</p>
        ) : (
          <div className={isPlaceholderData ? "opacity-60 transition-opacity" : undefined}>
            <TransactionTable
              transactions={data.items}
              selected={selected}
              onSelectedChange={setSelected}
              onEdit={setEditing}
            />
          </div>
        )}
      </div>

      {data && data.meta.last_page > 1 && (
        <nav className="flex items-center justify-center gap-3" aria-label="Pages">
          <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => change(setPage)(page - 1)}>
            <ChevronLeft aria-hidden />
            Previous
          </Button>
          <span className="font-mono text-sm text-muted-foreground">
            {data.meta.current_page} / {data.meta.last_page}
          </span>
          <Button variant="ghost" size="sm" disabled={page >= data.meta.last_page} onClick={() => change(setPage)(page + 1)}>
            Next
            <ChevronRight aria-hidden />
          </Button>
        </nav>
      )}

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete {selected.size} {selected.size === 1 ? "transaction" : "transactions"}?
            </DialogTitle>
            <DialogDescription>Budgets and savings goals they count toward will update. This can&apos;t be undone.</DialogDescription>
          </DialogHeader>
          {remove.isError && <p className="text-xs text-destructive">{remove.error.message}</p>}
          <DialogFooter showCloseButton>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() =>
                remove.mutate([...selected], {
                  onSuccess: () => {
                    setSelected(new Set());
                    setConfirming(false);
                  },
                })
              }
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TransactionDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        transaction={editing ?? undefined}
      />
    </div>
  );
}
