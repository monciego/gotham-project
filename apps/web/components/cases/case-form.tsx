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
import { TagInput } from "@/components/forms/tag-input";
import { RichTextEditor } from "@/components/intel/rich-text-editor";
import { isBlank } from "@/components/intel/rich-text";
import { ChoicePills } from "@/components/missions/choice-pills";
import { say } from "@/lib/alfred";
import { useCases, useCreateCase, useUpdateCase } from "@/lib/case-queries";
import { todayIso } from "@/lib/format";
import { applyApiErrors } from "@/lib/form-errors";
import type { Case, CaseColor, CaseInput } from "@/lib/types";
import { useAlfredStore } from "@/stores/alfred";
import { CASE_COLORS, STATUS_LABELS } from "./case-meta";

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

const schema = z
  .object({
    name: z.string().trim().min(1, "Give the case a name, sir.").max(100),
    description: z.string().max(5000),
    status: z.enum(["planning", "active", "on_hold", "completed", "archived"]),
    category: z.string().max(50),
    start_date: z.string().regex(isoDate, "When does it begin?"),
    target_end_date: z.string(),
    progress_mode: z.enum(["auto", "manual"]),
    color: z.enum(["gray", "blue", "purple", "red", "teal", "pink"]),
    tags: z.array(z.string()).max(10),
    notes: z.string().max(50000),
  })
  .refine((values) => !values.target_end_date || values.target_end_date >= values.start_date, {
    path: ["target_end_date"],
    message: "The target can't come before the start, sir.",
  });

type FormValues = z.infer<typeof schema>;

const FIELDS = [
  "name",
  "description",
  "status",
  "category",
  "start_date",
  "target_end_date",
  "progress_mode",
  "color",
  "tags",
  "notes",
] as const;

const PROGRESS_MODES = [
  { value: "auto", label: "Auto" },
  { value: "manual", label: "Manual" },
];

function toValues(item?: Case): FormValues {
  return {
    name: item?.name ?? "",
    description: item?.description ?? "",
    status: item?.status ?? "planning",
    category: item?.category ?? "",
    start_date: item?.start_date ?? todayIso(),
    target_end_date: item?.target_end_date ?? "",
    progress_mode: item?.progress_mode ?? "auto",
    color: item?.color ?? "blue",
    tags: item?.tags ?? [],
    notes: item?.notes ?? "",
  };
}

function toInput(values: FormValues): Partial<CaseInput> {
  const { status, ...rest } = values;
  return {
    ...rest,
    name: values.name.trim(),
    description: values.description.trim() || null,
    category: values.category.trim() || null,
    target_end_date: values.target_end_date || null,
    notes: isBlank(values.notes) ? null : values.notes,
    // Closing happens on the case page; leaving "Completed" selected keeps it closed.
    ...(status !== "completed" && { status }),
  };
}

export function CaseForm({ item }: { item?: Case }) {
  const router = useRouter();
  const { data: cases } = useCases();
  const create = useCreateCase();
  const update = useUpdateCase(item?.id ?? 0);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    control,
    watch,
    setValue,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toValues(item) });
  const color = watch("color");
  const progressMode = watch("progress_mode");
  const categories = [...new Set(cases?.map((other) => other.category).filter((category) => category !== null))];

  async function onSubmit(values: FormValues) {
    setFormError(null);
    try {
      const saved = item
        ? await update.mutateAsync(toInput(values))
        : await create.mutateAsync(toInput(values) as CaseInput);
      if (!item) {
        useAlfredStore.getState().say({ mood: "encouraging", title: say("caseOpened", 0), message: saved.name });
      }
      router.push(`/cases/${saved.id}`);
    } catch (error) {
      setFormError(applyApiErrors(error, setError, FIELDS));
    }
  }

  const invalid = (field: (typeof FIELDS)[number]) => ({
    "aria-invalid": !!errors[field],
    "aria-describedby": errors[field] ? `${field}-error` : undefined,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5">
      {formError && <FormAlert>{formError}</FormAlert>}

      <Field id="name" label="Name" error={errors.name?.message}>
        <Input id="name" autoFocus={!item} {...invalid("name")} {...register("name")} />
      </Field>

      <Field id="description" label="Description (optional)" error={errors.description?.message}>
        <Textarea id="description" rows={3} {...invalid("description")} {...register("description")} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="status" label="Status" error={errors.status?.message}>
          <NativeSelect id="status" className="w-full" {...invalid("status")} {...register("status")}>
            {(["planning", "active", "on_hold", "archived"] as const).map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
            {item?.status === "completed" && <option value="completed">Completed (closed)</option>}
          </NativeSelect>
        </Field>
        <Field id="category" label="Category (optional)" error={errors.category?.message}>
          <Input
            id="category"
            list="case-categories"
            placeholder="Business, Gotham, Personal…"
            {...invalid("category")}
            {...register("category")}
          />
          <datalist id="case-categories">
            {categories.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="start_date" label="Start date" error={errors.start_date?.message}>
          <Input id="start_date" type="date" {...invalid("start_date")} {...register("start_date")} />
        </Field>
        <Field id="target_end_date" label="Target end date (optional)" error={errors.target_end_date?.message}>
          <Input id="target_end_date" type="date" {...invalid("target_end_date")} {...register("target_end_date")} />
        </Field>
      </div>

      <div className="grid gap-1.5">
        <ChoicePills
          name="progress_mode"
          legend="Progress"
          options={PROGRESS_MODES}
          registration={register("progress_mode")}
          error={errors.progress_mode?.message}
        />
        <p className="text-xs text-muted-foreground">
          {progressMode === "auto"
            ? "Follows the case's missions: the share of them completed."
            : "You set it yourself with a slider on the case page."}
        </p>
      </div>

      <fieldset className="grid gap-1.5">
        <legend className="mb-1.5 text-sm font-medium">Color</legend>
        <div role="radiogroup" aria-label="Color" className="flex gap-2">
          {(Object.entries(CASE_COLORS) as [CaseColor, string][]).map(([name, hex]) => (
            <button
              key={name}
              type="button"
              role="radio"
              aria-checked={color === name}
              aria-label={name}
              title={name}
              onClick={() => setValue("color", name, { shouldDirty: true })}
              className={cn(
                "size-7 rounded-full ring-offset-2 ring-offset-background transition-shadow duration-200",
                color === name && "ring-2 ring-foreground",
              )}
              style={{ backgroundColor: hex }}
            />
          ))}
        </div>
      </fieldset>

      <Field id="tags" label="Tags" error={errors.tags?.message}>
        <Controller
          control={control}
          name="tags"
          render={({ field }) => <TagInput id="tags" value={field.value} onChange={field.onChange} />}
        />
      </Field>

      <div className="grid gap-1.5">
        <span id="notes-label" className="text-sm font-medium">
          Notes (optional)
        </span>
        <Controller
          control={control}
          name="notes"
          render={({ field }) => (
            <RichTextEditor
              id="notes"
              value={field.value}
              onChange={field.onChange}
              invalid={!!errors.notes}
              describedBy={errors.notes ? "notes-error" : undefined}
            />
          )}
        />
        {errors.notes && (
          <p id="notes-error" className="text-xs text-destructive">
            {errors.notes.message}
          </p>
        )}
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Link href={item ? `/cases/${item.id}` : "/cases"} className={buttonVariants({ variant: "ghost" })}>
          Cancel
        </Link>
        <div className="sm:w-56">
          <SubmitButton loading={isSubmitting}>
            <span className="font-mono tracking-[0.2em]">{item ? "UPDATE CASE" : "OPEN CASE"}</span>
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
