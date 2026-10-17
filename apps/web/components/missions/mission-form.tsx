"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { buttonVariants } from "@gotham/ui/components/ui/button";
import { Input } from "@gotham/ui/components/ui/input";
import { Textarea } from "@gotham/ui/components/ui/textarea";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Field } from "@/components/forms/field";
import { FormAlert } from "@/components/forms/form-alert";
import { NativeSelect } from "@/components/forms/native-select";
import { SubmitButton } from "@/components/forms/submit-button";
import { say } from "@/lib/alfred";
import { todayIso } from "@/lib/format";
import { applyApiErrors } from "@/lib/form-errors";
import { useCases, useCreateMission, useUpdateMission } from "@/lib/mission-queries";
import { useMe } from "@/lib/queries";
import type { Mission, MissionInput } from "@/lib/types";
import { ChoicePills } from "./choice-pills";
import { TagInput } from "./tag-input";

const schema = z.object({
  title: z.string().trim().min(1, "Give the mission a name.").max(255),
  description: z.string().max(5000),
  why_it_matters: z
    .string()
    .trim()
    .min(10, "Give it a little more thought: at least 10 characters.")
    .max(2000),
  priority: z.enum(["critical", "high", "medium", "low"]),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a due date."),
  due_time: z.string(),
  estimated_minutes: z.string().regex(/^\d*$/, "Whole minutes, please."),
  case_id: z.string(),
  energy_required: z.enum(["high", "medium", "low"]),
  tags: z.array(z.string()).max(10),
  notes: z.string().max(10000),
  past_self_message: z.string().max(2000),
});

type FormValues = z.infer<typeof schema>;

const FIELDS = [
  "title",
  "description",
  "why_it_matters",
  "priority",
  "due_date",
  "due_time",
  "estimated_minutes",
  "case_id",
  "energy_required",
  "tags",
  "notes",
  "past_self_message",
] as const;

const PRIORITIES = [
  { value: "critical", label: "Critical", dot: "bg-priority-critical" },
  { value: "high", label: "High", dot: "bg-priority-high" },
  { value: "medium", label: "Medium", dot: "bg-priority-medium" },
  { value: "low", label: "Low", dot: "bg-priority-low" },
];

const ENERGY = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

function toValues(mission?: Mission): FormValues {
  return {
    title: mission?.title ?? "",
    description: mission?.description ?? "",
    why_it_matters: mission?.why_it_matters ?? "",
    priority: mission?.priority ?? "medium",
    due_date: mission?.due_date ?? todayIso(),
    due_time: mission?.due_time ?? "",
    estimated_minutes: mission?.estimated_minutes?.toString() ?? "",
    case_id: mission?.case_id?.toString() ?? "",
    energy_required: mission?.energy_required ?? "medium",
    tags: mission?.tags ?? [],
    notes: mission?.notes ?? "",
    past_self_message: mission?.past_self_message ?? "",
  };
}

/** Empty optional fields go to the API as null. */
function toInput(values: FormValues): MissionInput {
  const orNull = (value: string) => value.trim() || null;
  return {
    ...values,
    description: orNull(values.description),
    due_time: orNull(values.due_time),
    estimated_minutes: values.estimated_minutes ? Number(values.estimated_minutes) : null,
    case_id: values.case_id ? Number(values.case_id) : null,
    notes: orNull(values.notes),
    past_self_message: orNull(values.past_self_message),
  };
}

export function MissionForm({ mission }: { mission?: Mission }) {
  const router = useRouter();
  const { data: user } = useMe();
  const { data: cases } = useCases();
  const create = useCreateMission();
  const update = useUpdateMission(mission?.id ?? 0);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toValues(mission) });

  async function onSubmit(values: FormValues) {
    setFormError(null);
    try {
      const saved = mission
        ? await update.mutateAsync(toInput(values))
        : await create.mutateAsync(toInput(values));
      router.push(`/missions/${saved.id}`);
    } catch (error) {
      setFormError(applyApiErrors(error, setError, FIELDS));
    }
  }

  const invalid = (field: (typeof FIELDS)[number]) => ({
    "aria-invalid": !!errors[field],
    "aria-describedby": errors[field] ? `${field}-error` : undefined,
  });
  const firstName = user?.name.split(" ")[0] ?? "sir";

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5">
      {formError && <FormAlert>{formError}</FormAlert>}

      <Field id="title" label="Title" error={errors.title?.message}>
        <Input id="title" autoFocus={!mission} {...invalid("title")} {...register("title")} />
      </Field>

      <Field id="description" label="Description (optional)" error={errors.description?.message}>
        <Textarea id="description" rows={3} {...invalid("description")} {...register("description")} />
      </Field>

      {/* The heart of a mission, so it stands out. */}
      <div className="grid gap-1.5 rounded-xl border border-primary/40 bg-primary/5 p-4">
        <label htmlFor="why_it_matters" className="text-base font-semibold text-primary">
          Why does this matter to you, {firstName}?
        </label>
        <p className="text-xs text-muted-foreground">{say("whyHelper", 0)}</p>
        <Textarea
          id="why_it_matters"
          rows={3}
          className="mt-1"
          {...invalid("why_it_matters")}
          {...register("why_it_matters")}
        />
        {errors.why_it_matters && (
          <p id="why_it_matters-error" className="text-xs text-destructive">
            {errors.why_it_matters.message}
          </p>
        )}
      </div>

      <ChoicePills
        name="priority"
        legend="Priority"
        options={PRIORITIES}
        registration={register("priority")}
        error={errors.priority?.message}
      />

      <div className="grid gap-5 sm:grid-cols-3">
        <Field id="due_date" label="Due date" error={errors.due_date?.message}>
          <Input id="due_date" type="date" {...invalid("due_date")} {...register("due_date")} />
        </Field>
        <Field id="due_time" label="Time (optional)" error={errors.due_time?.message}>
          <Input id="due_time" type="time" {...invalid("due_time")} {...register("due_time")} />
        </Field>
        <Field id="estimated_minutes" label="Estimate (minutes)" error={errors.estimated_minutes?.message}>
          <Input
            id="estimated_minutes"
            inputMode="numeric"
            placeholder="50"
            {...invalid("estimated_minutes")}
            {...register("estimated_minutes")}
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="case_id" label="Case (optional)" error={errors.case_id?.message}>
          <NativeSelect id="case_id" className="w-full" {...invalid("case_id")} {...register("case_id")}>
            <option value="">No case</option>
            {cases?.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <ChoicePills
          name="energy_required"
          legend="Energy required"
          options={ENERGY}
          registration={register("energy_required")}
          error={errors.energy_required?.message}
        />
      </div>

      <Field id="tags" label="Tags" error={errors.tags?.message}>
        <Controller
          control={control}
          name="tags"
          render={({ field }) => <TagInput id="tags" value={field.value} onChange={field.onChange} />}
        />
      </Field>

      <Field id="notes" label="Notes (optional)" error={errors.notes?.message}>
        <Textarea id="notes" rows={3} {...invalid("notes")} {...register("notes")} />
      </Field>

      <Field
        id="past_self_message"
        label="Message to future-you who doesn't feel like doing this"
        error={errors.past_self_message?.message}
      >
        <Textarea
          id="past_self_message"
          rows={3}
          placeholder="Hey, I know you don't want to start this. But here's why you should..."
          {...invalid("past_self_message")}
          {...register("past_self_message")}
        />
      </Field>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Link
          href={mission ? `/missions/${mission.id}` : "/missions"}
          className={buttonVariants({ variant: "ghost" })}
        >
          Cancel
        </Link>
        <div className="sm:w-56">
          <SubmitButton loading={isSubmitting}>
            <span className="font-mono tracking-[0.2em]">{mission ? "UPDATE MISSION" : "CREATE MISSION"}</span>
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
