import type { Metadata } from "next";
import Link from "next/link";
import { AuthHeading } from "@/components/auth/auth-heading";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { FormAlert } from "@/components/forms/form-alert";
import { say } from "@/lib/alfred";

export const metadata: Metadata = { title: "Reset password · Gotham Project" };

/** Opened from the link in the reset email: /reset-password?token=…&email=… */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { token, email } = await searchParams;

  return (
    <>
      <AuthHeading title={say("resetTitle", 0)} subtitle={say("resetSubtitle", 0)} />
      {typeof token === "string" && typeof email === "string" ? (
        <ResetPasswordForm token={token} email={email} />
      ) : (
        <div className="grid gap-4">
          <FormAlert>This reset link is incomplete. Please request a new one.</FormAlert>
          <Link href="/forgot-password" className="text-center text-sm text-primary hover:underline">
            Request a new link
          </Link>
        </div>
      )}
    </>
  );
}
