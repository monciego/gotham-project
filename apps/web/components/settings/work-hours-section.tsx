"use client";

import { Button } from "@gotham/ui/components/ui/button";
import { Input } from "@gotham/ui/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Field } from "@/components/forms/field";
import { say } from "@/lib/alfred";
import { applyApiErrors } from "@/lib/form-errors";
import { useUpdateSettings } from "@/lib/settings-queries";
import type { Settings } from "@/lib/types";
import { SaveStatus, SettingsSection } from "./settings-section";

export const DEFAULT_WORK_HOURS = { start: "09:00", end: "18:00" };

export const workHoursSchema = z
  .object({
    work_start_time: z.string().regex(/^\d{2}:\d{2}$/, "Choose a start time."),
    work_end_time: z.string().regex(/^\d{2}:\d{2}$/, "Choose an end time."),
  })
  .refine((values) => values.work_start_time !== values.work_end_time, {
    path: ["work_end_time"],
    message: "The day must end some time after it starts, sir.",
  });

type WorkHoursValues = z.infer<typeof workHoursSchema>;

const FIELDS = ["work_start_time", "work_end_time"] as const;

export function WorkHoursSection({ settings }: { settings: Settings }) {
  const update = useUpdateSettings();
  const [status, setStatus] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<WorkHoursValues>({
    resolver: zodResolver(workHoursSchema),
    values: {
      work_start_time: settings.work_start_time ?? DEFAULT_WORK_HOURS.start,
      work_end_time: settings.work_end_time ?? DEFAULT_WORK_HOURS.end,
    },
  });

  const onSubmit = handleSubmit((values) => {
    setStatus(null);
    update.mutate(values, {
      onSuccess: () => setStatus({ tone: "success", text: say("settingsSaved", 0) }),
      onError: (error) => {
        const message = applyApiErrors(error, setError, FIELDS);
        if (message) setStatus({ tone: "error", text: message });
      },
    });
  });

  return (
    <SettingsSection
      id="work-hours"
      title="Work hours"
      description="Used for focus block suggestions and scheduling."
    >
      <form onSubmit={onSubmit} noValidate className="grid gap-4">
        <div className="grid max-w-md gap-4 sm:grid-cols-2">
          <Field id="work_start_time" label="Start" error={errors.work_start_time?.message}>
            <Input id="work_start_time" type="time" aria-invalid={!!errors.work_start_time} {...register("work_start_time")} />
          </Field>
          <Field id="work_end_time" label="End" error={errors.work_end_time?.message}>
            <Input id="work_end_time" type="time" aria-invalid={!!errors.work_end_time} {...register("work_end_time")} />
          </Field>
        </div>
        {!settings.work_start_time && (
          <p className="text-xs text-muted-foreground">Not set yet: Alfred assumes 9 to 6 until you save.</p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={(!isDirty && !!settings.work_start_time) || update.isPending}>
            {update.isPending && <Loader2 className="animate-spin" aria-hidden />}
            Save hours
          </Button>
          <SaveStatus status={status} />
        </div>
      </form>
    </SettingsSection>
  );
}
