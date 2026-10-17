import type { Metadata } from "next";
import { AuthHeading } from "@/components/auth/auth-heading";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { say } from "@/lib/alfred";

export const metadata: Metadata = { title: "Forgot password · Gotham Project" };

export default function ForgotPasswordPage() {
  return (
    <>
      <AuthHeading title={say("forgotTitle", 0)} subtitle={say("forgotSubtitle", 0)} />
      <ForgotPasswordForm />
    </>
  );
}
