"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { buttonVariants } from "@gotham/ui/components/ui/button";
import { Input } from "@gotham/ui/components/ui/input";
import { Textarea } from "@gotham/ui/components/ui/textarea";
import { cn } from "@gotham/ui/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Field } from "@/components/forms/field";
import { FormAlert } from "@/components/forms/form-alert";
import { NativeSelect } from "@/components/forms/native-select";
import { SubmitButton } from "@/components/forms/submit-button";
import { ChoicePills } from "@/components/missions/choice-pills";
import { say } from "@/lib/alfred";
import { useCreateHabit, useUpdateHabit } from "@/lib/arsenal-queries";
import { applyApiErrors } from "@/lib/form-errors";
import { useAlfredStore } from "@/stores/alfred";
import type { Habit, HabitCategory, HabitInput, HabitType, Mode } from "@/lib/types";
import { CATEGORY_LABELS, MODE_LABELS, TYPE_LABELS, WEEKDAYS } from "./habit-meta";
import { TogglePills } from "./toggle-pills";

const CATEGORIES = Object.keys(CATEGORY_LABELS) as [HabitCategory, ...HabitCategory[]];
const TYPES = Object.keys(TYPE_LABELS) as [HabitType, ...HabitType[]];
const MODES = Object.keys(MODE_LABELS) as [Mode, ...Mode[]];
const wholeNumber = z.string().regex(/^\d*$/, "Whole numbers, please.");

const schema = z
  .object({
    name: z.string().trim().min(1, "Give the habit a name.").max(100),
    description: z.string().max(1000),
    category: z.enum(CATEGORIES),
    type: z.enum(TYPES),
    times: wholeNumber,
    days: z.array(z.number()),
    every: wholeNumber,
    target_value: wholeNumber,
    unit: z.string().max(30),
    reminder_time: z.string(),
    mode_specific: z.array(z.enum(MODES)),
    active: z.boolean(),
  })
  .superRefine((values, context) => {
    const require = (path: string, ok: boolean, message: string) =>
      ok || context.addIssue({ code: "custom", path: [path], message });
    const number = (value: string) => Number(value || 0);

    if (values.type === "weekly") require("times", number(values.times) >= 1 && number(values.times) <= 7, "Between 1 and 7 times, sir.");
    if (values.type === "specific_days") require("days", values.days.length > 0, "Choose at least one day, sir.");
    if (values.type === "interval") require("every", number(values.every) >= 1 && number(values.every) <= 365, "Every 1 to 365 days, sir.");
    if (values.type === "measurable") {
      require("target_value", number(values.target_value) >= 1, "A target, sir. Otherwise how will we know?");
      require("unit", values.unit.trim() !== "", "Pages, glasses, minutes? Give it a unit, sir.");
    }
  });

type FormValues = z.infer<typeof schema>;

const FIELDS = ["name", "description", "category", "type", "target_value", "unit", "reminder_time", "mode_specific", "active"] as const;

const TYPE_OPTIONS = TYPES.map((type) => ({ value: type, label: TYPE_LABELS[type] }));

const TYPE_HINTS: Record<HabitType, string> = {
  daily: "Every day.",
  weekly: "A number of times each week, any days you like.",
  specific_days: "On the days you choose.",
  interval: "Again once a number of days have passed since the last time.",
  measurable: "Every day, with an amount to reach.",
  yes_no: "Every day: did you, or didn't you?",
};

function toValues(habit?: Habit): FormValues {
  return {
    name: habit?.name ?? "",
    description: habit?.description ?? "",
    category: (CATEGORIES as string[]).includes(habit?.category ?? "") ? (habit!.category as HabitCategory) : "health",
    type: habit?.type ?? "daily",
    times: String(habit?.frequency.times ?? 3),
    days: habit?.frequency.days ?? [1, 3, 5],
    every: String(habit?.frequency.every ?? 2),
    target_value: habit?.target_value?.toString() ?? "",
    unit: habit?.unit ?? "",
    reminder_time: habit?.reminder_time ?? "",
    mode_specific: habit?.mode_specific ?? [],
    active: habit?.active ?? true,
  };
}

function toInput(values: FormValues): HabitInput {
  const frequency = {
    weekly: { times: Number(values.times) },
    specific_days: { days: values.days },
    interval: { every: Number(values.every) },
  }[values.type as string] ?? {};
  const measurable = values.type === "measurable";

  return {
    name: values.name.trim(),
    description: values.description.trim() || null,
    category: values.category,
    type: values.type,
    frequency,
    target_value: measurable ? Number(values.target_value) : null,
    unit: measurable ? values.unit.trim() : null,
    reminder_time: values.reminder_time || null,
    mode_specific: values.mode_specific,
    active: values.active,
  };
}

export function HabitForm({ habit }: { habit?: Habit }) {
  const router = useRouter();
  const create = useCreateHabit();
  const update = useUpdateHabit(habit?.id ?? 0);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    control,
    watch,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toValues(habit) });
  const type = watch("type");

  async function onSubmit(values: FormValues) {
    setFormError(null);
    try {
      const saved = habit ? await update.mutateAsync(toInput(values)) : await create.mutateAsync(toInput(values));
      if (!habit) {
        useAlfredStore.getState().say({ mood: "encouraging", title: say("habitCreated", 0), message: saved.name });
      }
      router.push(`/arsenal/${saved.id}`);
    } catch (error) {
      setFormError(applyApiErrors(error, setError, FIELDS));
    }
  }

  const invalid = (field: keyof FormValues) => ({
    "aria-invalid": !!errors[field],
    "aria-describedby": errors[field] ? `${field}-error` : undefined,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5">
      {formError && <FormAlert>{formError}</FormAlert>}

      <Field id="name" label="Name" error={errors.name?.message}>
        <Input id="name" autoFocus={!habit} placeholder="Morning run" {...invalid("name")} {...register("name")} />
      </Field>

      <Field id="description" label="Description (optional)" error={errors.description?.message}>
        <Textarea id="description" rows={2} {...invalid("description")} {...register("description")} />
      </Field>

      <Field id="category" label="Category" error={errors.category?.message}>
        <NativeSelect id="category" className="w-full sm:w-64" {...invalid("category")} {...register("category")}>
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {CATEGORY_LABELS[category]}
            </option>
          ))}
        </NativeSelect>
      </Field>

      <div className="grid gap-2">
        <ChoicePills name="type" legend="Type" options={TYPE_OPTIONS} registration={register("type")} error={errors.type?.message} />
        <p className="text-xs text-muted-foreground">{TYPE_HINTS[type]}</p>
      </div>

      {/* Settings for the chosen type. */}
      {type === "weekly" && (
        <Field id="times" label="Times per week" error={errors.times?.message}>
          <div className="flex items-center gap-2">
            <Input id="times" inputMode="numeric" className="w-20" {...invalid("times")} {...register("times")} />
            <span className="text-sm text-muted-foreground">times per week</span>
          </div>
        </Field>
      )}

      {type === "specific_days" && (
        <Controller
          control={control}
          name="days"
          render={({ field }) => (
            <TogglePills
              id="days"
              legend="Days"
              options={WEEKDAYS.map((day) => ({ value: day.iso, label: day.short }))}
              value={field.value}
              onChange={field.onChange}
              error={errors.days?.message}
            />
          )}
        />
      )}

      {type === "interval" && (
        <Field id="every" label="Interval" error={errors.every?.message}>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Every</span>
            <Input id="every" inputMode="numeric" className="w-20" {...invalid("every")} {...register("every")} />
            <span className="text-sm text-muted-foreground">days</span>
          </div>
        </Field>
      )}

      {type === "measurable" && (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="target_value" label="Daily target" error={errors.target_value?.message}>
            <Input id="target_value" inputMode="numeric" placeholder="8" {...invalid("target_value")} {...register("target_value")} />
          </Field>
          <Field id="unit" label="Unit" error={errors.unit?.message}>
            <Input id="unit" placeholder="glasses" {...invalid("unit")} {...register("unit")} />
          </Field>
        </div>
      )}

      <Field id="reminder_time" label="Reminder (optional)" error={errors.reminder_time?.message}>
        <Input id="reminder_time" type="time" className="w-36" {...invalid("reminder_time")} {...register("reminder_time")} />
      </Field>

      <Controller
        control={control}
        name="mode_specific"
        render={({ field }) => (
          <TogglePills
            id="mode_specific"
            legend="Modes"
            hint="Only show it in these modes. Choose none for every mode."
            options={MODES.map((mode) => ({ value: mode, label: MODE_LABELS[mode] }))}
            value={field.value}
            onChange={field.onChange}
            error={errors.mode_specific?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="active"
        render={({ field }) => (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
            <div>
              <p id="active-label" className="text-sm font-medium">
                Active
              </p>
              <p className="text-xs text-muted-foreground">Archived habits leave today&apos;s list but keep their history.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={field.value}
              aria-labelledby="active-label"
              onClick={() => field.onChange(!field.value)}
              className={cn(
                "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200",
                field.value ? "bg-primary" : "bg-muted",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 left-0.5 size-5 rounded-full bg-background transition-transform duration-200",
                  field.value && "translate-x-5",
                )}
              />
            </button>
          </div>
        )}
      />

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Link href={habit ? `/arsenal/${habit.id}` : "/arsenal"} className={buttonVariants({ variant: "ghost" })}>
          Cancel
        </Link>
        <div className="sm:w-56">
          <SubmitButton loading={isSubmitting}>
            <span className="font-mono tracking-[0.2em]">{habit ? "UPDATE HABIT" : "ADD TO ARSENAL"}</span>
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
