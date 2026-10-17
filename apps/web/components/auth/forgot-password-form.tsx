"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@gotham/ui/components/ui/input";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Field } from "@/components/forms/field";
import { FormAlert } from "@/components/forms/form-alert";
import { SubmitButton } from "@/components/forms/submit-button";
import { say } from "@/lib/alfred";
import { api } from "@/lib/api";
import { applyApiErrors } from "@/lib/form-errors";

const schema = z.object({
  email: z.email("Enter a valid email address."),
});

type ForgotValues = z.infer<typeof schema>;

export function ForgotPasswordForm() {
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotValues) {
    setFormError(null);
    try {
      await api.post("/auth/forgot-password", values);
      setSent(true);
    } catch (error) {
      setFormError(applyApiErrors(error, setError, ["email"]));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
      {sent && <FormAlert tone="success">{say("forgotSent", 0)}</FormAlert>}
      {formError && <FormAlert>{formError}</FormAlert>}

      <Field id="email" label="Email" error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          autoFocus
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
          {...register("email")}
        />
      </Field>

      <SubmitButton loading={isSubmitting}>Send reset link</SubmitButton>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
