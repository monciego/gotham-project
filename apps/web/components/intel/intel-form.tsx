"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, buttonVariants } from "@gotham/ui/components/ui/button";
import { Input } from "@gotham/ui/components/ui/input";
import { Textarea } from "@gotham/ui/components/ui/textarea";
import { Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Field } from "@/components/forms/field";
import { FormAlert } from "@/components/forms/form-alert";
import { SubmitButton } from "@/components/forms/submit-button";
import { TagInput } from "@/components/forms/tag-input";
import { applyApiErrors } from "@/lib/form-errors";
import { useCreateIntel, useUpdateIntel } from "@/lib/intel-queries";
import type { IntelEntry, IntelInput, IntelMood } from "@/lib/types";
import { LevelSlider } from "./level-slider";
import { MoodPicker } from "./mood-picker";
import { PromptCard } from "./prompt-card";
import { isBlank } from "./rich-text";
import { RichTextEditor } from "./rich-text-editor";
import { type DraftStatus, useDraft } from "./use-draft";

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date."),
  content: z.string().refine((html) => !isBlank(html), "Write a few words first, sir."),
  mood: z.enum(["great", "good", "okay", "bad", "terrible"], "How was the day, sir?"),
  energy_level: z.number().int().min(1).max(10),
  stress_level: z.number().int().min(1).max(10),
  gratitude: z.string().max(5000),
  wins: z.string().max(5000),
  struggles: z.string().max(5000),
  tags: z.array(z.string()).max(10),
});

type FormValues = z.infer<typeof schema>;

const FIELDS = ["date", "content", "mood", "energy_level", "stress_level", "gratitude", "wins", "struggles", "tags"] as const;

function toValues(entry: IntelEntry | undefined, date: string): FormValues {
  return {
    date: entry?.date ?? date,
    content: entry?.content ?? "",
    // No mood until one is chosen; the schema insists on one before saving.
    mood: entry?.mood ?? (undefined as unknown as IntelMood),
    energy_level: entry?.energy_level ?? 5,
    stress_level: entry?.stress_level ?? 5,
    gratitude: entry?.gratitude ?? "",
    wins: entry?.wins ?? "",
    struggles: entry?.struggles ?? "",
    tags: entry?.tags ?? [],
  };
}

function toInput(values: FormValues): IntelInput {
  const orNull = (value: string) => value.trim() || null;
  return {
    ...values,
    gratitude: orNull(values.gratitude),
    wins: orNull(values.wins),
    struggles: orNull(values.struggles),
  };
}

const STATUS_TEXT: Record<DraftStatus, string> = {
  idle: "",
  unsaved: "Unsaved changes",
  saving: "Saving...",
  saved: "Saved",
};

type IntelFormProps = {
  entry?: IntelEntry;
  /** Today in the user's timezone, or the day picked on the calendar. */
  defaultDate: string;
  /** The latest day an entry can be for. */
  maxDate: string;
};

export function IntelForm({ entry, defaultDate, maxDate }: IntelFormProps) {
  const router = useRouter();
  const create = useCreateIntel();
  const update = useUpdateIntel(entry?.id ?? 0);
  const [formError, setFormError] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(!entry);

  const {
    register,
    control,
    watch,
    reset,
    getValues,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toValues(entry, defaultDate) });

  const draft = useDraft(
    entry ? `gotham-intel-draft:${entry.id}` : "gotham-intel-draft:new",
    useCallback(() => getValues(), [getValues]),
    entry ? Date.parse(entry.updated_at) : 0,
  );
  const { markChanged } = draft;

  useEffect(() => {
    const subscription = watch(() => markChanged());
    return () => subscription.unsubscribe();
  }, [watch, markChanged]);

  async function onSubmit(values: FormValues) {
    setFormError(null);
    try {
      const saved = entry ? await update.mutateAsync(toInput(values)) : (await create.mutateAsync(toInput(values))).entry;
      draft.clear();
      router.push(`/intel/${saved.id}`);
    } catch (error) {
      setFormError(applyApiErrors(error, setError, FIELDS));
    }
  }

  const invalid = (field: keyof FormValues) => ({
    "aria-invalid": !!errors[field],
    "aria-describedby": errors[field] ? `${field}-error` : undefined,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-6">
      {draft.found && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 text-sm">
          <p>
            You have an unsaved draft from{" "}
            {new Date(draft.found.savedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}.
          </p>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={draft.clear}>
              Discard
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                reset(draft.found!.values as FormValues);
                draft.dismissFound();
              }}
            >
              Restore draft
            </Button>
          </div>
        </div>
      )}

      {showPrompt && <PromptCard onDismiss={() => setShowPrompt(false)} />}

      {formError && <FormAlert>{formError}</FormAlert>}

      <Field id="date" label="Date" error={errors.date?.message}>
        <Input id="date" type="date" max={maxDate} className="w-44" {...invalid("date")} {...register("date")} />
      </Field>

      <div className="grid gap-1.5">
        <span id="content-label" className="text-sm font-medium">
          Intel
        </span>
        <Controller
          control={control}
          name="content"
          render={({ field }) => (
            <RichTextEditor
              id="content"
              value={field.value}
              onChange={field.onChange}
              invalid={!!errors.content}
              describedBy={errors.content ? "content-error" : undefined}
            />
          )}
        />
        {errors.content && (
          <p id="content-error" className="text-xs text-destructive">
            {errors.content.message}
          </p>
        )}
      </div>

      <Controller
        control={control}
        name="mood"
        render={({ field }) => <MoodPicker value={field.value} onChange={field.onChange} error={errors.mood?.message} />}
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <LevelSlider
          id="energy_level"
          label="Energy"
          value={watch("energy_level")}
          registration={register("energy_level", { valueAsNumber: true })}
        />
        <LevelSlider
          id="stress_level"
          label="Stress"
          value={watch("stress_level")}
          registration={register("stress_level", { valueAsNumber: true })}
        />
      </div>

      <Field id="gratitude" label="What are you grateful for today?" error={errors.gratitude?.message}>
        <Textarea id="gratitude" rows={2} {...invalid("gratitude")} {...register("gratitude")} />
      </Field>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field id="wins" label="What went well?" error={errors.wins?.message}>
          <Textarea id="wins" rows={3} {...invalid("wins")} {...register("wins")} />
        </Field>
        <Field id="struggles" label="What was challenging?" error={errors.struggles?.message}>
          <Textarea id="struggles" rows={3} {...invalid("struggles")} {...register("struggles")} />
        </Field>
      </div>

      <Field id="tags" label="Tags" error={errors.tags?.message}>
        <Controller
          control={control}
          name="tags"
          render={({ field }) => <TagInput id="tags" value={field.value} onChange={field.onChange} />}
        />
      </Field>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
          {draft.status === "saving" && <Loader2 className="size-3 animate-spin" aria-hidden />}
          {draft.status === "saved" && <Check className="size-3 text-emerald-400" aria-hidden />}
          {STATUS_TEXT[draft.status]}
          {draft.status === "saved" && <span className="text-muted-foreground/70"> · draft on this device</span>}
        </p>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
          <Link href={entry ? `/intel/${entry.id}` : "/intel"} className={buttonVariants({ variant: "ghost" })}>
            Cancel
          </Link>
          <div className="sm:w-48">
            <SubmitButton loading={isSubmitting}>
              <span className="font-mono tracking-[0.2em]">SAVE INTEL</span>
            </SubmitButton>
          </div>
        </div>
      </div>
    </form>
  );
}
