"use client";

import { Button } from "@gotham/ui/components/ui/button";
import { Input } from "@gotham/ui/components/ui/input";
import { Skeleton } from "@gotham/ui/components/ui/skeleton";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, X, Zap } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Field } from "@/components/forms/field";
import { NativeSelect } from "@/components/forms/native-select";
import { say } from "@/lib/alfred";
import { api } from "@/lib/api";
import { arsenalKeys, useArsenal, useCreateHabit } from "@/lib/arsenal-queries";
import { applyApiErrors } from "@/lib/form-errors";
import { HABIT_SCHEDULES, HABIT_SUGGESTIONS, MAX_ONBOARDING_HABITS } from "@/lib/onboarding";
import type { HabitCategory } from "@/lib/types";
import { StepHeader, StepNav } from "./step-header";

const schema = z.object({
  name: z.string().trim().min(1, "Name the habit, sir.").max(100),
  schedule: z.string(),
});

type HabitValues = z.infer<typeof schema>;

export function HabitsStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const queryClient = useQueryClient();
  const { data: habits, isPending } = useArsenal();
  const create = useCreateHabit();
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/arsenal/${id}`),
    onSettled: () => queryClient.invalidateQueries({ queryKey: arsenalKeys.all }),
  });
  const [category, setCategory] = useState<HabitCategory>("other");
  const [formError, setFormError] = useState<string | null>(null);
  const active = (habits ?? []).filter((habit) => habit.active);
  const full = active.length >= MAX_ONBOARDING_HABITS;

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    reset,
    formState: { errors },
  } = useForm<HabitValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", schedule: "daily" },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    const schedule = HABIT_SCHEDULES.find((option) => option.value === values.schedule) ?? HABIT_SCHEDULES[0]!;
    create.mutate(
      {
        name: values.name,
        description: null,
        category,
        type: schedule.type,
        frequency: schedule.frequency,
        target_value: null,
        unit: null,
        reminder_time: null,
        mode_specific: [],
        active: true,
      },
      {
        onSuccess: () => {
          reset({ name: "", schedule: values.schedule });
          setCategory("other");
        },
        onError: (error) => setFormError(applyApiErrors(error, setError, ["name"])),
      },
    );
  });

  const unused = HABIT_SUGGESTIONS.filter(
    (suggestion) => !active.some((habit) => habit.name.toLowerCase() === suggestion.name.toLowerCase()),
  );

  return (
    <div>
      <StepHeader eyebrow="THE ARSENAL" title="Set your first habits" intro={say("onboardingHabits", 0)} />

      {!full && (
        <form onSubmit={onSubmit} noValidate className="grid gap-4">
          {unused.length > 0 && (
            <div className="flex flex-wrap gap-2" aria-label="Suggestions">
              {unused.map((suggestion) => (
                <button
                  key={suggestion.name}
                  type="button"
                  onClick={() => {
                    setValue("name", suggestion.name, { shouldValidate: true });
                    setValue("schedule", suggestion.schedule);
                    setCategory(suggestion.category);
                  }}
                  className="rounded-full border border-border px-3 py-1 text-sm text-muted-foreground transition-colors duration-200 hover:border-primary/60 hover:text-foreground"
                >
                  {suggestion.name}
                </button>
              ))}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-[1fr_9rem_auto] sm:items-end">
            <Field id="habit-name" label="Habit" error={errors.name?.message}>
              <Input id="habit-name" placeholder="e.g. Meditate" aria-invalid={!!errors.name} {...register("name")} />
            </Field>
            <Field id="habit-schedule" label="How often">
              <NativeSelect id="habit-schedule" {...register("schedule")}>
                {HABIT_SCHEDULES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Button type="submit" variant="outline" disabled={create.isPending}>
              {create.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <Plus aria-hidden />}
              Add habit
            </Button>
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
        </form>
      )}

      <ul className="mt-6 grid gap-2" aria-label="Your habits">
        {isPending && <Skeleton className="h-11 w-full" />}
        {active.map((habit) => (
          <li key={habit.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
            <Zap className="size-4 text-primary" aria-hidden />
            <span className="flex-1 truncate text-sm font-medium">{habit.name}</span>
            <span className="text-xs text-muted-foreground">
              {HABIT_SCHEDULES.find((option) => option.type === habit.type)?.label ?? habit.type}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove ${habit.name}`}
              disabled={remove.isPending}
              onClick={() => remove.mutate(habit.id)}
            >
              <X aria-hidden />
            </Button>
          </li>
        ))}
        {!isPending && active.length === 0 && (
          <li className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
            At least one, sir. Every hero starts with a single tool.
          </li>
        )}
      </ul>
      {full && <p className="mt-3 text-sm text-muted-foreground">Three is plenty to begin with, sir.</p>}

      <StepNav onBack={onBack} onNext={onNext} disabled={active.length === 0} />
    </div>
  );
}
