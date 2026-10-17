"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@gotham/ui/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Field } from "@/components/forms/field";
import { FormAlert } from "@/components/forms/form-alert";
import { SubmitButton } from "@/components/forms/submit-button";
import { applyApiErrors } from "@/lib/form-errors";
import { HOME } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth";

const schema = z
  .object({
    name: z.string().trim().min(1, "Enter your name.").max(255),
    email: z.email("Enter a valid email address."),
    password: z.string().min(8, "Use at least 8 characters."),
    password_confirmation: z.string(),
    timezone: z.string().min(1, "Choose your timezone."),
  })
  .refine((values) => values.password === values.password_confirmation, {
    message: "Passwords don't match.",
    path: ["password_confirmation"],
  });

type RegisterValues = z.infer<typeof schema>;

const FIELDS = ["name", "email", "password", "password_confirmation", "timezone"] as const;

export function RegisterForm({ timezones }: { timezones: string[] }) {
  const router = useRouter();
  const registerUser = useAuthStore((state) => state.register);
  const [formError, setFormError] = useState<string | null>(null);
  const [options, setOptions] = useState(timezones);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      password_confirmation: "",
      timezone: "UTC",
    },
  });

  // The browser's timezone is only known after hydration.
  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!detected) return;
    setOptions((current) => (current.includes(detected) ? current : [detected, ...current]));
    setValue("timezone", detected);
  }, [setValue]);

  async function onSubmit(values: RegisterValues) {
    setFormError(null);
    try {
      await registerUser(values);
      router.replace(HOME);
      router.refresh();
    } catch (error) {
      setFormError(applyApiErrors(error, setError, FIELDS));
    }
  }

  const invalid = (field: (typeof FIELDS)[number]) => ({
    "aria-invalid": !!errors[field],
    "aria-describedby": errors[field] ? `${field}-error` : undefined,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
      {formError && <FormAlert>{formError}</FormAlert>}

      <Field id="name" label="Name" error={errors.name?.message}>
        <Input id="name" autoComplete="name" autoFocus {...invalid("name")} {...register("name")} />
      </Field>

      <Field id="email" label="Email" error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          {...invalid("email")}
          {...register("email")}
        />
      </Field>

      <Field id="password" label="Password" error={errors.password?.message}>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          {...invalid("password")}
          {...register("password")}
        />
      </Field>

      <Field
        id="password_confirmation"
        label="Confirm password"
        error={errors.password_confirmation?.message}
      >
        <Input
          id="password_confirmation"
          type="password"
          autoComplete="new-password"
          {...invalid("password_confirmation")}
          {...register("password_confirmation")}
        />
      </Field>

      <Field id="timezone" label="Timezone" error={errors.timezone?.message}>
        <select
          id="timezone"
          className="h-8 w-full rounded-lg border border-input bg-input/30 px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
          {...invalid("timezone")}
          {...register("timezone")}
        >
          {options.map((zone) => (
            <option key={zone} value={zone} className="bg-card">
              {zone.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </Field>

      <SubmitButton loading={isSubmitting}>Create account</SubmitButton>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
