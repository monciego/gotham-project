"use client";

import { Input } from "@gotham/ui/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { ButlerSilhouette } from "@/components/alfred/butler-silhouette";
import { Field } from "@/components/forms/field";
import { Switch } from "@/components/forms/switch";
import { DEFAULT_WORK_HOURS, workHoursSchema } from "@/components/settings/work-hours-section";
import { ModeCards } from "@/components/shell/mode-cards";
import { say } from "@/lib/alfred";
import { api } from "@/lib/api";
import { applyApiErrors } from "@/lib/form-errors";
import { queryKeys } from "@/lib/queries";
import { HOME } from "@/lib/routes";
import { useCompleteOnboarding } from "@/lib/settings-queries";
import type { ApiEnvelope, Mode, NotificationSwitch, Settings, SettingsInput, User } from "@/lib/types";
import { StepHeader, StepNav } from "./step-header";

type StepProps = { onNext: () => void; onBack: () => void };

/** Saves settings during onboarding, quietly: no Alfred announcements yet. */
function useSaveSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SettingsInput) => api.put<ApiEnvelope<Settings>>("/settings", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.me }),
  });
}

const PHILOSOPHY = [
  { title: "Every mission has a why.", text: "Alfred asks why it matters, and reminds you when it counts." },
  { title: "Small disciplines, daily.", text: "Your Arsenal of habits does the heavy lifting over time." },
  { title: "Honest, never cruel.", text: "He notices the patterns: avoidance, burnout, streaks at risk, and speaks up." },
];

export function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center">
      <ButlerSilhouette className="mx-auto h-20 w-16" />
      <blockquote className="mx-auto mt-6 max-w-md text-xl leading-snug font-medium tracking-tight">
        “{say("onboardingWelcome", 0)}”
      </blockquote>
      <ul className="mx-auto mt-8 grid max-w-md gap-4 text-left">
        {PHILOSOPHY.map((item) => (
          <li key={item.title} className="flex gap-3">
            <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <p className="text-sm">
              <span className="font-medium">{item.title}</span>{" "}
              <span className="text-muted-foreground">{item.text}</span>
            </p>
          </li>
        ))}
      </ul>
      <StepNav onNext={onNext} nextLabel="Begin" />
    </div>
  );
}

export function ModeStep({ user, onNext, onBack }: StepProps & { user: User }) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>(user.current_mode);
  const save = useMutation({
    mutationFn: (next: Mode) => api.put("/settings/mode", { mode: next }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.me }),
  });

  return (
    <div>
      <StepHeader eyebrow="LIFE MODE" title="Choose your default mode" intro={say("onboardingMode", 0)} />
      <ModeCards value={mode} onChange={setMode} />
      <StepNav
        onBack={onBack}
        busy={save.isPending}
        error={save.error?.message}
        onNext={() => (mode === user.current_mode && !save.isSuccess ? onNext() : save.mutate(mode, { onSuccess: onNext }))}
      />
    </div>
  );
}

type HoursValues = z.infer<typeof workHoursSchema>;

export function HoursStep({ user, onNext, onBack }: StepProps & { user: User }) {
  const save = useSaveSettings();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<HoursValues>({
    resolver: zodResolver(workHoursSchema),
    defaultValues: {
      work_start_time: user.work_start_time ?? DEFAULT_WORK_HOURS.start,
      work_end_time: user.work_end_time ?? DEFAULT_WORK_HOURS.end,
    },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    save.mutate(values, {
      onSuccess: onNext,
      onError: (error) => setFormError(applyApiErrors(error, setError, ["work_start_time", "work_end_time"])),
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <StepHeader eyebrow="WORK HOURS" title="When does your working day run?" intro={say("onboardingHours", 0)} />
      <div className="grid max-w-sm gap-4 sm:grid-cols-2">
        <Field id="onboarding-start" label="Start" error={errors.work_start_time?.message}>
          <Input id="onboarding-start" type="time" aria-invalid={!!errors.work_start_time} {...register("work_start_time")} />
        </Field>
        <Field id="onboarding-end" label="End" error={errors.work_end_time?.message}>
          <Input id="onboarding-end" type="time" aria-invalid={!!errors.work_end_time} {...register("work_end_time")} />
        </Field>
      </div>
      <StepNav onBack={onBack} busy={save.isPending} error={formError} />
    </form>
  );
}

const ONBOARDING_NOTIFICATIONS: { key: NotificationSwitch; label: string; description: string }[] = [
  { key: "morning_brief", label: "Morning Brief", description: "Your day at a glance, at the top of HQ." },
  { key: "alfred_alerts", label: "Alfred Alerts", description: "When nothing's started, or a mission keeps slipping." },
  { key: "streak_warnings", label: "Streak Warnings", description: "At 8pm, when a streak is about to break." },
];

export function NotificationsStep({ user, onNext, onBack }: StepProps & { user: User }) {
  const save = useSaveSettings();
  const [preferences, setPreferences] = useState(() =>
    Object.fromEntries(ONBOARDING_NOTIFICATIONS.map(({ key }) => [key, user.notification_preferences[key]])),
  );

  return (
    <div>
      <StepHeader eyebrow="NOTIFICATIONS" title="How often shall Alfred speak up?" intro={say("onboardingNotifications", 0)} />
      <div className="divide-y divide-border">
        {ONBOARDING_NOTIFICATIONS.map(({ key, label, description }) => (
          <div key={key} className="flex items-center justify-between gap-4 py-3">
            <div>
              <label htmlFor={`onboarding-${key}`} className="text-sm font-medium">
                {label}
              </label>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <Switch
              id={`onboarding-${key}`}
              checked={!!preferences[key]}
              onChange={(checked) => setPreferences((current) => ({ ...current, [key]: checked }))}
            />
          </div>
        ))}
      </div>
      <StepNav
        onBack={onBack}
        busy={save.isPending}
        error={save.error?.message}
        onNext={() => save.mutate({ notification_preferences: preferences }, { onSuccess: onNext })}
      />
    </div>
  );
}

export function ReadyStep({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const router = useRouter();
  const complete = useCompleteOnboarding();
  const [entering, startTransition] = useTransition();

  return (
    <div className="text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="mx-auto grid size-20 place-items-center rounded-full border border-primary/50"
      >
        <span aria-hidden className="text-3xl">
          🦇
        </span>
      </motion.div>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">{say("onboardingReady", 0)}</h1>
      <p className="mt-2 font-mono text-sm tracking-[0.2em] text-primary">{say("onboardingReadyDetail", 0).toUpperCase()}</p>
      <StepNav
        onBack={onBack}
        nextLabel="Enter the Batcave"
        busy={complete.isPending || entering}
        error={complete.error?.message}
        onNext={() =>
          complete.mutate(undefined, {
            onSuccess: () => {
              onDone();
              startTransition(() => {
                router.replace(HOME);
                router.refresh();
              });
            },
          })
        }
      />
    </div>
  );
}
