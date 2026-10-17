"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@gotham/ui/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@gotham/ui/components/ui/dialog";
import { Input } from "@gotham/ui/components/ui/input";
import { cn } from "@gotham/ui/lib/utils";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Field } from "@/components/forms/field";
import { FormAlert } from "@/components/forms/form-alert";
import { NativeSelect } from "@/components/forms/native-select";
import { todayIso } from "@/lib/format";
import { applyApiErrors } from "@/lib/form-errors";
import { formatMoney, parseMoney } from "@/lib/money";
import { useResourceCategories, useSaveTransaction } from "@/lib/resource-queries";
import type { Transaction, TransactionInput } from "@/lib/types";
import { useAlfredStore } from "@/stores/alfred";
import { CategorySelect } from "./category-select";

const schema = z
  .object({
    type: z.enum(["income", "expense"]),
    amount: z.string().refine((value) => parseMoney(value) > 0, "An amount above zero, sir. Dollars and cents only."),
    category: z.string().trim().min(1, "Choose a category.").max(50),
    description: z.string().max(255),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
    account: z.string().max(50),
    recurring: z.boolean(),
    recurring_frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
  });

type FormValues = z.infer<typeof schema>;

const FIELDS = ["type", "amount", "category", "description", "date", "account", "recurring", "recurring_frequency"] as const;

function toValues(transaction: Transaction | undefined, today: string): FormValues {
  return {
    type: transaction?.type ?? "expense",
    amount: transaction ? transaction.amount.toFixed(2) : "",
    category: transaction?.category ?? "",
    description: transaction?.description ?? "",
    date: transaction?.date ?? today,
    account: transaction?.account ?? "",
    recurring: transaction?.recurring ?? false,
    recurring_frequency: transaction?.recurring_frequency ?? "monthly",
  };
}

function toInput(values: FormValues): TransactionInput {
  return {
    ...values,
    amount: parseMoney(values.amount),
    category: values.category.trim(),
    description: values.description.trim() || null,
    account: values.account.trim() || null,
    recurring_frequency: values.recurring ? values.recurring_frequency : null,
  };
}

type TransactionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Editing this one; otherwise a new transaction. */
  transaction?: Transaction;
  /** The user's today, for new transactions. */
  today?: string;
};

export function TransactionDialog({ open, onOpenChange, transaction, today }: TransactionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{transaction ? "Edit transaction" : "Quick add"}</DialogTitle>
        </DialogHeader>
        {/* Remounts per opening, so a new transaction starts blank. */}
        {open && <TransactionForm transaction={transaction} today={today ?? todayIso()} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function TransactionForm({ transaction, today, onDone }: { transaction?: Transaction; today: string; onDone: () => void }) {
  const save = useSaveTransaction(transaction?.id);
  const { data: categories } = useResourceCategories();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    control,
    watch,
    setValue,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toValues(transaction, today) });
  const type = watch("type");
  const recurring = watch("recurring");

  async function onSubmit(values: FormValues) {
    setFormError(null);
    try {
      const saved = await save.mutateAsync(toInput(values));
      if (!transaction) {
        useAlfredStore.getState().say({
          mood: "encouraging",
          title: saved.type === "income" ? "Income logged, sir." : "Expense logged, sir.",
          message: `${formatMoney(saved.amount)} · ${saved.category}`,
        });
      }
      onDone();
    } catch (error) {
      setFormError(applyApiErrors(error, setError, FIELDS));
    }
  }

  const invalid = (field: keyof FormValues) => ({
    "aria-invalid": !!errors[field],
    "aria-describedby": errors[field] ? `${field}-error` : undefined,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
      {formError && <FormAlert>{formError}</FormAlert>}

      <div role="radiogroup" aria-label="Type" className="grid grid-cols-2 rounded-full border border-border p-1">
        {(["expense", "income"] as const).map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={type === option}
            onClick={() => {
              setValue("type", option);
              // Categories differ by type.
              setValue("category", "");
            }}
            className={cn(
              "rounded-full py-2 text-sm font-medium transition-colors duration-200",
              type === option
                ? option === "income"
                  ? "bg-emerald-500 text-black"
                  : "bg-red-500 text-white"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option === "income" ? "Income" : "Expense"}
          </button>
        ))}
      </div>

      <Field id="amount" label="Amount" error={errors.amount?.message}>
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 font-mono text-2xl text-muted-foreground">
            $
          </span>
          <Input
            id="amount"
            inputMode="decimal"
            autoFocus
            placeholder="0.00"
            className={cn("h-14 pl-8 font-mono text-3xl md:text-3xl", type === "income" ? "text-emerald-400" : "text-red-400")}
            {...invalid("amount")}
            {...register("amount", {
              // Tidy to 1,234.50 on leaving the field.
              onBlur: (event) => {
                const amount = parseMoney(event.target.value);
                if (amount > 0) setValue("amount", amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
              },
            })}
          />
        </div>
      </Field>

      <Field id="category" label="Category" error={errors.category?.message}>
        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <CategorySelect
              key={type}
              id="category"
              options={categories?.[type] ?? []}
              value={field.value}
              onChange={field.onChange}
              invalid={!!errors.category}
            />
          )}
        />
      </Field>

      <Field id="description" label="Description (optional)" error={errors.description?.message}>
        <Input id="description" placeholder="Dinner at the Iceberg Lounge" {...invalid("description")} {...register("description")} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="date" label="Date" error={errors.date?.message}>
          <Input id="date" type="date" {...invalid("date")} {...register("date")} />
        </Field>
        <Field id="account" label="Account (optional)" error={errors.account?.message}>
          <Input id="account" placeholder="Visa, Checking…" {...invalid("account")} {...register("account")} />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3">
        <label className="flex flex-1 cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-primary" {...register("recurring")} />
          Repeats
        </label>
        {recurring && (
          <NativeSelect aria-label="How often" {...register("recurring_frequency")}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </NativeSelect>
        )}
        {recurring && (
          <p className="w-full text-xs text-muted-foreground">Alfred adds a copy each time it falls due, counting from this date.</p>
        )}
      </div>

      <Button type="submit" size="lg" className="h-11 font-mono tracking-[0.2em]" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
        {transaction ? "SAVE" : type === "income" ? "ADD INCOME" : "ADD EXPENSE"}
      </Button>
    </form>
  );
}
