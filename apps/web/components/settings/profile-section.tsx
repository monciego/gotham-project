"use client";

import { Button } from "@gotham/ui/components/ui/button";
import { Input } from "@gotham/ui/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Field } from "@/components/forms/field";
import { NativeSelect } from "@/components/forms/native-select";
import { UserAvatar } from "@/components/shell/user-avatar";
import { say } from "@/lib/alfred";
import { ApiError } from "@/lib/api";
import { applyApiErrors } from "@/lib/form-errors";
import { useUpdatePassword, useUpdateProfile } from "@/lib/settings-queries";
import type { User } from "@/lib/types";
import { SaveStatus, SettingsSection } from "./settings-section";

/** Matches Laravel's `image|max:2048`. */
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

const schema = z.object({
  name: z.string().trim().min(1, "Your name, sir.").max(255),
  email: z.email("That doesn't look like an email address.").max(255),
  timezone: z.string().min(1, "Choose your timezone."),
});

type ProfileValues = z.infer<typeof schema>;

const PROFILE_FIELDS = ["name", "email", "timezone"] as const;

type Status = { tone: "success" | "error"; text: string } | null;

export function ProfileSection({ user, timezones }: { user: User; timezones: string[] }) {
  const update = useUpdateProfile();
  const fileInput = useRef<HTMLInputElement>(null);
  /** undefined: keep the current avatar; null: remove it; a File: replace it. */
  const [avatar, setAvatar] = useState<File | null | undefined>(undefined);
  const [preview, setPreview] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const options = timezones.includes(user.timezone) ? timezones : [user.timezone, ...timezones];

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileValues>({
    resolver: zodResolver(schema),
    values: { name: user.name, email: user.email, timezone: user.timezone },
  });

  // The preview is a blob URL; free it when it's replaced or the section unmounts.
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  function chooseAvatar(file: File | undefined) {
    setAvatarError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setAvatarError("That isn't an image, sir.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError("Keep it under 2 MB, sir.");
      return;
    }
    setAvatar(file);
    setPreview(URL.createObjectURL(file));
  }

  function removeAvatar() {
    setAvatar(user.avatar_url ? null : undefined);
    setPreview(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  const onSubmit = handleSubmit((values) => {
    setStatus(null);
    update.mutate(
      { ...values, avatar },
      {
        onSuccess: (saved) => {
          setAvatar(undefined);
          setPreview(null);
          reset({ name: saved.name, email: saved.email, timezone: saved.timezone });
          setStatus({ tone: "success", text: say("profileSaved", 0) });
        },
        onError: (error) => {
          const message = applyApiErrors(error, setError, PROFILE_FIELDS);
          const avatarMessage = error instanceof ApiError ? error.errors.avatar?.[0] : undefined;
          if (avatarMessage) {
            setAvatarError(avatarMessage);
          } else if (message) {
            setStatus({ tone: "error", text: message });
          }
        },
      },
    );
  });

  const shownAvatar = avatar === null ? { ...user, avatar_url: null } : preview ? { ...user, avatar_url: preview } : user;
  const changed = isDirty || avatar !== undefined;

  return (
    <SettingsSection id="profile" title="Profile" description="How Alfred knows you.">
      <form onSubmit={onSubmit} noValidate className="grid gap-5">
        <div className="flex items-center gap-4">
          <UserAvatar user={shownAvatar} className="size-16 text-lg" />
          <div className="grid gap-2">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
                <Camera aria-hidden />
                {user.avatar_url || preview ? "Change photo" : "Upload photo"}
              </Button>
              {(preview || (user.avatar_url && avatar !== null)) && (
                <Button type="button" variant="ghost" size="sm" onClick={removeAvatar}>
                  <Trash2 aria-hidden />
                  Remove
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {preview ? "Preview. Save to keep it." : avatar === null ? "Removed. Save to confirm." : "JPG, PNG or WebP, up to 2 MB."}
            </p>
            {avatarError && <p className="text-xs text-destructive">{avatarError}</p>}
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            aria-label="Profile photo"
            onChange={(event) => chooseAvatar(event.target.files?.[0])}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="name" label="Name" error={errors.name?.message}>
            <Input id="name" autoComplete="name" aria-invalid={!!errors.name} {...register("name")} />
          </Field>
          <Field id="email" label="Email" error={errors.email?.message}>
            <Input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register("email")} />
          </Field>
          <Field id="timezone" label="Timezone" error={errors.timezone?.message}>
            <NativeSelect id="timezone" aria-invalid={!!errors.timezone} {...register("timezone")}>
              {options.map((zone) => (
                <option key={zone} value={zone}>
                  {zone.replaceAll("_", " ")}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={!changed || update.isPending}>
            {update.isPending && <Loader2 className="animate-spin" aria-hidden />}
            Save profile
          </Button>
          <SaveStatus status={status} />
        </div>
      </form>

      <PasswordForm />
    </SettingsSection>
  );
}

const passwordSchema = z
  .object({
    current_password: z.string().min(1, "Your current password, sir."),
    password: z.string().min(8, "At least 8 characters."),
    password_confirmation: z.string(),
  })
  .refine((values) => values.password === values.password_confirmation, {
    path: ["password_confirmation"],
    message: "The passwords don't match.",
  });

type PasswordValues = z.infer<typeof passwordSchema>;

const PASSWORD_FIELDS = ["current_password", "password", "password_confirmation"] as const;

function PasswordForm() {
  const update = useUpdatePassword();
  const [status, setStatus] = useState<Status>(null);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current_password: "", password: "", password_confirmation: "" },
  });

  const onSubmit = handleSubmit((values) => {
    setStatus(null);
    update.mutate(values, {
      onSuccess: () => {
        reset();
        setStatus({ tone: "success", text: say("passwordSaved", 0) });
      },
      onError: (error) => {
        const message = applyApiErrors(error, setError, PASSWORD_FIELDS);
        if (message) setStatus({ tone: "error", text: message });
      },
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="mt-6 grid gap-4 border-t border-border pt-5">
      <p className="text-sm font-medium">Password</p>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="current_password" label="Current" error={errors.current_password?.message}>
          <Input
            id="current_password"
            type="password"
            autoComplete="current-password"
            aria-invalid={!!errors.current_password}
            {...register("current_password")}
          />
        </Field>
        <Field id="password" label="New" error={errors.password?.message}>
          <Input id="password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} {...register("password")} />
        </Field>
        <Field id="password_confirmation" label="Confirm" error={errors.password_confirmation?.message}>
          <Input
            id="password_confirmation"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.password_confirmation}
            {...register("password_confirmation")}
          />
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="outline" disabled={update.isPending}>
          {update.isPending && <Loader2 className="animate-spin" aria-hidden />}
          Change password
        </Button>
        <SaveStatus status={status} />
      </div>
    </form>
  );
}
