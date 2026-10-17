"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@gotham/ui/components/ui/input";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Field } from "@/components/forms/field";
import { FormAlert } from "@/components/forms/form-alert";
import { SubmitButton } from "@/components/forms/submit-button";
import { api } from "@/lib/api";
import { applyApiErrors } from "@/lib/form-errors";

const schema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters."),
    password_confirmation: z.string(),
  })
  .refine((values) => values.password === values.password_confirmation, {
    message: "Passwords don't match.",
    path: ["password_confirmation"],
  });

type ResetValues = z.infer<typeof schema>;

export function ResetPasswordForm({ token, email }: { token: string; email: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", password_confirmation: "" },
  });

  async function onSubmit(values: ResetValues) {
    setFormError(null);
    try {
      await api.post("/auth/reset-password", { ...values, token, email });
      router.replace("/login?reset=1");
    } catch (error) {
      // An expired or used token comes back as an error on "email", shown above the form.
      setFormError(applyApiErrors(error, setError, ["password", "password_confirmation"]));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
      {formError && <FormAlert>{formError}</FormAlert>}

      <p className="text-sm text-muted-foreground">
        Resetting the password for <span className="text-foreground">{email}</span>
      </p>

      <Field id="password" label="New password" error={errors.password?.message}>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          autoFocus
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? "password-error" : undefined}
          {...register("password")}
        />
      </Field>

      <Field
        id="password_confirmation"
        label="Confirm new password"
        error={errors.password_confirmation?.message}
      >
        <Input
          id="password_confirmation"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.password_confirmation}
          aria-describedby={errors.password_confirmation ? "password_confirmation-error" : undefined}
          {...register("password_confirmation")}
        />
      </Field>

      <SubmitButton loading={isSubmitting}>Reset password</SubmitButton>
    </form>
  );
}
