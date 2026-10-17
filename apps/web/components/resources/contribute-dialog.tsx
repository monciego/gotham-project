"use client";

import { Button } from "@gotham/ui/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@gotham/ui/components/ui/dialog";
import { Input } from "@gotham/ui/components/ui/input";
import { Skeleton } from "@gotham/ui/components/ui/skeleton";
import { cn } from "@gotham/ui/lib/utils";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { FormAlert } from "@/components/forms/form-alert";
import { formatDay, formatMoney, parseMoney } from "@/lib/money";
import { useContribute, useTransactions } from "@/lib/resource-queries";
import type { SavingsGoal } from "@/lib/types";

type ContributeDialogProps = {
  goal: SavingsGoal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Put money toward a goal: a new amount, or a transaction already logged. */
export function ContributeDialog({ goal, open, onOpenChange }: ContributeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Contribute to {goal.name}</DialogTitle>
          <DialogDescription>
            {formatMoney(goal.current_amount)} of {formatMoney(goal.target_amount)} so far.
          </DialogDescription>
        </DialogHeader>
        {open && <ContributeForm goal={goal} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function ContributeForm({ goal, onDone }: { goal: SavingsGoal; onDone: () => void }) {
  const [mode, setMode] = useState<"new" | "link">("new");
  const [amount, setAmount] = useState("");
  const [account, setAccount] = useState("");
  const [picked, setPicked] = useState<number | null>(null);
  const contribute = useContribute(goal.id);
  const { data: unlinked, isPending } = useTransactions({ unlinked: "1" }, 1, 30);
  const value = parseMoney(amount);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    contribute.mutate(mode === "new" ? { amount: value, account: account.trim() || null } : { resource_id: picked! }, { onSuccess: onDone });
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div role="radiogroup" aria-label="How" className="grid grid-cols-2 rounded-full border border-border p-1 text-sm">
        {(
          [
            ["new", "New amount"],
            ["link", "Link a transaction"],
          ] as const
        ).map(([option, label]) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={mode === option}
            onClick={() => setMode(option)}
            className={cn(
              "rounded-full py-1.5 transition-colors duration-200",
              mode === option ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {contribute.isError && <FormAlert>{contribute.error.message}</FormAlert>}

      {mode === "new" ? (
        <div className="grid gap-3">
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 font-mono text-xl text-muted-foreground">$</span>
            <Input
              autoFocus
              inputMode="decimal"
              aria-label="Amount"
              placeholder="0.00"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="h-12 pl-7 font-mono text-2xl md:text-2xl"
            />
          </div>
          <Input aria-label="From account (optional)" placeholder="From account (optional)" value={account} onChange={(event) => setAccount(event.target.value)} />
          <p className="text-xs text-muted-foreground">Logged as a Savings expense for today.</p>
        </div>
      ) : isPending ? (
        <Skeleton className="h-40" />
      ) : !unlinked || unlinked.items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Every transaction already counts toward a goal, sir.</p>
      ) : (
        <ul role="radiogroup" aria-label="Transaction" className="grid max-h-64 gap-1 overflow-y-auto">
          {unlinked.items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                role="radio"
                aria-checked={picked === item.id}
                onClick={() => setPicked(item.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors duration-200",
                  picked === item.id ? "border-primary bg-primary/10" : "border-transparent hover:bg-accent",
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate">{item.description ?? item.category}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDay(item.date)} · {item.category}
                  </span>
                </span>
                <span className="font-mono">{formatMoney(item.amount)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Button type="submit" disabled={contribute.isPending || (mode === "new" ? !(value > 0) : picked === null)}>
        {contribute.isPending && <Loader2 className="animate-spin" aria-hidden />}
        Contribute
      </Button>
    </form>
  );
}
