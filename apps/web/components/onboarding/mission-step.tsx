"use client";

import { Input } from "@gotham/ui/components/ui/input";
import { Textarea } from "@gotham/ui/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Field } from "@/components/forms/field";
import { say } from "@/lib/alfred";
import { applyApiErrors } from "@/lib/form-errors";
import { todayIn } from "@/lib/format";
import { useCreateMission, useMission } from "@/lib/mission-queries";
import { endOfWeek } from "@/lib/onboarding";
import type { User } from "@/lib/types";
import { StepHeader, StepNav } from "./step-header";

const schema = z.object({
  title: z.string().trim().min(1, "What's the mission, sir?").max(255),
  why_it_matters: z
    .string()
    .trim()
    .min(10, "Give it a little more thought: at least 10 characters.")
    .max(2000),
});

type MissionValues = z.infer<typeof schema>;

type MissionStepProps = {
  user: User;
  /** Set once the mission is saved, so going back doesn't create another. */
  missionId: number | null;
  onCreated: (id: number) => void;
  onNext: () => void;
  onBack: () => void;
};

export function MissionStep({ user, missionId, onCreated, onNext, onBack }: MissionStepProps) {
  const create = useCreateMission();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<MissionValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", why_it_matters: "" },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    create.mutate(
      {
        ...values,
        description: null,
        priority: "high",
        // "This week": due on Sunday.
        due_date: endOfWeek(todayIn(user.timezone)),
        due_time: null,
        estimated_minutes: null,
        case_id: null,
        energy_required: "medium",
        tags: [],
        notes: null,
        past_self_message: null,
      },
      {
        onSuccess: (mission) => {
          onCreated(mission.id);
          onNext();
        },
        onError: (error) => setFormError(applyApiErrors(error, setError, ["title", "why_it_matters"])),
      },
    );
  });

  if (missionId !== null) {
    return <SavedMission id={missionId} onNext={onNext} onBack={onBack} />;
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <StepHeader eyebrow="FIRST MISSION" title="Create your first mission" intro={say("onboardingMission", 0)} />
      <div className="grid gap-4">
        <Field id="mission-title" label="Mission" error={errors.title?.message}>
          <Input
            id="mission-title"
            placeholder="What's one thing you need to do this week?"
            aria-invalid={!!errors.title}
            {...register("title")}
          />
        </Field>
        <Field id="mission-why" label="Why it matters" error={errors.why_it_matters?.message}>
          <Textarea
            id="mission-why"
            rows={3}
            placeholder="Why does this matter to you?"
            aria-invalid={!!errors.why_it_matters}
            {...register("why_it_matters")}
          />
        </Field>
        <p className="text-xs text-muted-foreground">{say("whyHelper", 0)}</p>
      </div>
      <StepNav onBack={onBack} busy={create.isPending} error={formError} nextLabel="Create mission" />
    </form>
  );
}

/** Back on this step after saving: the mission, not a second form. */
function SavedMission({ id, onNext, onBack }: { id: number; onNext: () => void; onBack: () => void }) {
  const { data: mission } = useMission(id);

  return (
    <div>
      <StepHeader eyebrow="FIRST MISSION" title="Your first mission" />
      <div className="flex items-start gap-3 rounded-lg border border-border p-4">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <div>
          <p className="font-medium">{mission?.title ?? "Mission saved."}</p>
          <p className="text-sm text-muted-foreground">Due this Sunday. You&apos;ll find it under Missions.</p>
        </div>
      </div>
      <StepNav onBack={onBack} onNext={onNext} />
    </div>
  );
}
