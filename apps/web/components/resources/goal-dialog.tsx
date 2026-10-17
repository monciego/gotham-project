"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@gotham/ui/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@gotham/ui/components/ui/dialog";
import { Input } from "@gotham/ui/components/ui/input";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Field } from "@/components/forms/field";
import { FormAlert } from "@/components/forms/form-alert";
import { applyApiErrors } from "@/lib/form-errors";
import { parseMoney } from "@/lib/money";
import { useSaveGoal } from "@/lib/resource-queries";
import type { SavingsGoal } from "@/lib/types";

const schema = z.object({
  name: z.string().trim().min(1, "Name the goal, sir.").max(100),
  target_amount: z.string().refine((value) => parseMoney(value) >= 1, "A target of at least $1."),
  deadline: z.string(),
});

type FormValues = z.infer<typeof schema>;

const FIELDS = ["name", "target_amount", "deadline"] as const;

type GoalDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: SavingsGoal;
};

export function GoalDialog({ open, onOpenChange, goal }: GoalDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{goal ? "Edit goal" : "New savings goal"}</DialogTitle>
        </DialogHeader>
        {open && <GoalForm goal={goal} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function GoalForm({ goal, onDone }: { goal?: SavingsGoal; onDone: () => void }) {
  const save = useSaveGoal(goal?.id);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: goal?.name ?? "",
      target_amount: goal ? goal.target_amount.toFixed(2) : "",
      deadline: goal?.deadline ?? "",
    },
  });

  async function onSubmit(values: FormValues) {
    setFormError(null);
    try {
      await save.mutateAsync({
        name: values.name.trim(),
        target_amount: parseMoney(values.target_amount),
        deadline: values.deadline || null,
      });
      onDone();
    } catch (error) {
      setFormError(applyApiErrors(error, setError, FIELDS));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
      {formError && <FormAlert>{formError}</FormAlert>}
      <Field id="name" label="Name" error={errors.name?.message}>
        <Input id="name" autoFocus placeholder="New Batmobile tyres" aria-invalid={!!errors.name} {...register("name")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="target_amount" label="Target" error={errors.target_amount?.message}>
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">$</span>
            <Input
              id="target_amount"
              inputMode="decimal"
              placeholder="5,000"
              className="pl-6 font-mono"
              aria-invalid={!!errors.target_amount}
              {...register("target_amount")}
            />
          </div>
        </Field>
        <Field id="deadline" label="Deadline (optional)" error={errors.deadline?.message}>
          <Input id="deadline" type="date" aria-invalid={!!errors.deadline} {...register("deadline")} />
        </Field>
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
        {goal ? "Save goal" : "Create goal"}
      </Button>
    </form>
  );
}
