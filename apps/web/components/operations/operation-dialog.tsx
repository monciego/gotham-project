"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@gotham/ui/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@gotham/ui/components/ui/dialog";
import { Input } from "@gotham/ui/components/ui/input";
import { Textarea } from "@gotham/ui/components/ui/textarea";
import { cn } from "@gotham/ui/lib/utils";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Field } from "@/components/forms/field";
import { FormAlert } from "@/components/forms/form-alert";
import { NativeSelect } from "@/components/forms/native-select";
import { applyApiErrors } from "@/lib/form-errors";
import { useMissionOptions } from "@/lib/mission-queries";
import { useSaveOperation } from "@/lib/operation-queries";
import type { CalendarEntry, OperationColor, OperationInput } from "@/lib/types";
import { CATEGORY_LABELS, COLORS, FREQUENCY_LABELS, REMINDERS, addDays, localParts } from "./operation-meta";

const schema = z
  .object({
    title: z.string().trim().min(1, "Give it a title, sir.").max(255),
    description: z.string().max(5000),
    all_day: z.boolean(),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
    start_time: z.string(),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
    end_time: z.string(),
    category: z.enum(["work", "personal", "health", "social", "other"]),
    color: z.string(),
    recurring: z.boolean(),
    freq: z.enum(["daily", "weekly", "monthly", "yearly"]),
    until: z.string(),
    reminder: z.string(),
    mission_id: z.string(),
  })
  .superRefine((values, context) => {
    if (!values.all_day) {
      if (!values.start_time) context.addIssue({ code: "custom", path: ["start_time"], message: "Pick a time." });
      if (!values.end_time) context.addIssue({ code: "custom", path: ["end_time"], message: "Pick a time." });
    }
    const start = values.all_day ? values.start_date : `${values.start_date}T${values.start_time}`;
    const end = values.all_day ? values.end_date : `${values.end_date}T${values.end_time}`;
    if (values.all_day ? end < start : end <= start) {
      context.addIssue({ code: "custom", path: ["end_date"], message: "It has to end after it starts, sir." });
    }
    if (values.recurring && values.until && values.until < values.start_date) {
      context.addIssue({ code: "custom", path: ["until"], message: "The repeats must end after the first one." });
    }
  });

type FormValues = z.infer<typeof schema>;

const FIELDS = ["title", "description", "category", "color", "mission_id"] as const;

/** What the dialog opens with: an entry to edit, or a slot (and maybe a mission) for a new one. */
export type DialogInitial =
  | { entry: CalendarEntry }
  | { start?: Date; end?: Date; allDay?: boolean; title?: string; missionId?: number };

function toValues(initial: DialogInitial): FormValues {
  const blank = {
    description: "",
    category: "work" as const,
    color: "",
    recurring: false,
    freq: "weekly" as const,
    until: "",
    reminder: "",
    mission_id: "",
  };

  if ("entry" in initial) {
    const { entry } = initial;
    // Edit the series, not the occurrence that was clicked.
    const start = entry.series_start ?? entry.start;
    const end = entry.series_end ?? entry.end;
    const times = entry.all_day
      ? { start_date: start, start_time: "", end_date: addDays(end, -1), end_time: "" }
      : (() => {
          const from = localParts(new Date(start));
          const to = localParts(new Date(end));
          return { start_date: from.date, start_time: from.time, end_date: to.date, end_time: to.time };
        })();

    return {
      ...blank,
      ...times,
      title: entry.title,
      description: entry.description ?? "",
      all_day: entry.all_day,
      category: (Object.keys(CATEGORY_LABELS).includes(entry.category) ? entry.category : "other") as FormValues["category"],
      color: entry.color ?? "",
      recurring: !!entry.recurring,
      freq: entry.recurring_rule?.freq ?? "weekly",
      until: entry.recurring_rule?.until ?? "",
      reminder: entry.reminder_minutes ? String(entry.reminder_minutes) : "",
      mission_id: entry.mission ? String(entry.mission.id) : "",
    };
  }

  // A new event: the picked slot, or the next full hour for an hour.
  const nextHour = new Date();
  nextHour.setMinutes(0, 0, 0);
  nextHour.setHours(nextHour.getHours() + 1);
  const start = initial.start ?? nextHour;
  const end = initial.end ?? new Date(start.getTime() + 60 * 60_000);
  const from = localParts(start);
  const to = localParts(end);
  const allDay = initial.allDay ?? false;

  return {
    ...blank,
    title: initial.title ?? "",
    all_day: allDay,
    start_date: from.date,
    start_time: allDay ? "09:00" : from.time,
    // The calendar's all-day end is exclusive; the form shows the last day.
    end_date: allDay ? addDays(to.date, -1) : to.date,
    end_time: allDay ? "10:00" : to.time,
    mission_id: initial.missionId ? String(initial.missionId) : "",
  };
}

function toInput(values: FormValues): OperationInput {
  return {
    title: values.title.trim(),
    description: values.description.trim() || null,
    all_day: values.all_day,
    // Timed: the instant the browser means (the calendar shows browser-local times too).
    start: values.all_day ? values.start_date : new Date(`${values.start_date}T${values.start_time}`).toISOString(),
    end: values.all_day ? addDays(values.end_date, 1) : new Date(`${values.end_date}T${values.end_time}`).toISOString(),
    category: values.category,
    color: (values.color || null) as OperationColor | null,
    recurring: values.recurring,
    recurring_rule: values.recurring ? { freq: values.freq, until: values.until || null } : null,
    reminder_minutes: values.reminder ? Number(values.reminder) : null,
    mission_id: values.mission_id ? Number(values.mission_id) : null,
  };
}

type OperationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: DialogInitial;
  onSaved?: (entry: CalendarEntry) => void;
};

export function OperationDialog({ open, onOpenChange, initial, onSaved }: OperationDialogProps) {
  const editing = "entry" in initial;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit event" : "New event"}</DialogTitle>
        </DialogHeader>
        {open && (
          <OperationForm
            initial={initial}
            onDone={(entry) => {
              onSaved?.(entry);
              onOpenChange(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function OperationForm({ initial, onDone }: { initial: DialogInitial; onDone: (entry: CalendarEntry) => void }) {
  const entry = "entry" in initial ? initial.entry : undefined;
  const save = useSaveOperation(entry?.operation_id);
  const { data: missions } = useMissionOptions();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    watch,
    setValue,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toValues(initial) });
  const allDay = watch("all_day");
  const recurring = watch("recurring");
  const color = watch("color");
  const linked = entry?.mission;

  async function onSubmit(values: FormValues) {
    setFormError(null);
    try {
      onDone(await save.mutateAsync(toInput(values)));
    } catch (error) {
      setFormError(applyApiErrors(error, setError, FIELDS));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
      {formError && <FormAlert>{formError}</FormAlert>}

      <Field id="title" label="Title" error={errors.title?.message}>
        <Input id="title" autoFocus aria-invalid={!!errors.title} {...register("title")} />
      </Field>

      <Field id="description" label="Description (optional)" error={errors.description?.message}>
        <Textarea id="description" rows={2} {...register("description")} />
      </Field>

      <label className="flex w-fit cursor-pointer items-center gap-2 text-sm">
        <input type="checkbox" className="size-4 accent-primary" {...register("all_day")} />
        All day
      </label>

      {/* One row each: a date and a time side by side don't fit in half the dialog. */}
      <div className="grid gap-3">
        <Field id="start_date" label="Starts" error={errors.start_date?.message ?? errors.start_time?.message}>
          <div className="flex gap-2">
            <Input id="start_date" type="date" className="flex-1" {...register("start_date")} />
            {!allDay && <Input type="time" aria-label="Start time" className="w-32" {...register("start_time")} />}
          </div>
        </Field>
        <Field id="end_date" label="Ends" error={errors.end_date?.message ?? errors.end_time?.message}>
          <div className="flex gap-2">
            <Input id="end_date" type="date" className="flex-1" {...register("end_date")} />
            {!allDay && <Input type="time" aria-label="End time" className="w-32" {...register("end_time")} />}
          </div>
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="category" label="Category" error={errors.category?.message}>
          <NativeSelect id="category" className="w-full" {...register("category")}>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id="reminder" label="Reminder">
          <NativeSelect id="reminder" className="w-full" {...register("reminder")}>
            <option value="">None</option>
            {REMINDERS.map((reminder) => (
              <option key={reminder.value} value={reminder.value}>
                {reminder.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>

      <fieldset className="grid gap-1.5">
        <legend className="mb-1.5 text-sm font-medium">Color</legend>
        <div role="radiogroup" className="flex gap-2">
          {(Object.entries(COLORS) as [OperationColor, string][]).map(([name, hex]) => (
            <button
              key={name}
              type="button"
              role="radio"
              aria-checked={(color || "gray") === name}
              aria-label={name}
              title={name}
              onClick={() => setValue("color", name)}
              className={cn(
                "size-7 rounded-full ring-offset-2 ring-offset-background transition-shadow duration-200",
                (color || "gray") === name && "ring-2 ring-foreground",
              )}
              style={{ backgroundColor: hex }}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Events linked to a mission always show in gold.</p>
      </fieldset>

      <div className="grid gap-3 rounded-lg border border-border p-3">
        <label className="flex w-fit cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-primary" {...register("recurring")} />
          Repeats
        </label>
        {recurring && (
          <div className="grid gap-3 sm:grid-cols-2">
            <NativeSelect aria-label="How often" className="w-full" {...register("freq")}>
              {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
            <Field id="until" label="Until (optional)" error={errors.until?.message}>
              <Input id="until" type="date" {...register("until")} />
            </Field>
          </div>
        )}
      </div>

      <Field id="mission_id" label="Link to mission (optional)" error={errors.mission_id?.message}>
        <NativeSelect id="mission_id" className="w-full" {...register("mission_id")}>
          <option value="">No mission</option>
          {/* A finished mission stays selectable on events already linked to it. */}
          {linked && !missions?.some((mission) => mission.id === linked.id) && <option value={linked.id}>{linked.title}</option>}
          {missions?.map((mission) => (
            <option key={mission.id} value={mission.id}>
              {mission.title}
            </option>
          ))}
        </NativeSelect>
        <p className="text-xs text-muted-foreground">A linked mission takes this event&apos;s start as its due time.</p>
      </Field>

      <Button type="submit" size="lg" className="font-mono tracking-[0.2em]" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
        {entry ? "SAVE EVENT" : "ADD TO OPERATIONS"}
      </Button>
    </form>
  );
}
