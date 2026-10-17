import type { Metadata } from "next";
import { AuthHeading } from "@/components/auth/auth-heading";
import { RegisterForm } from "@/components/auth/register-form";
import { say } from "@/lib/alfred";

export const metadata: Metadata = { title: "Create account · Gotham Project" };

export default function RegisterPage() {
  // Built on the server so the browser hydrates the same option list.
  const timezones = Intl.supportedValuesOf("timeZone");
  if (!timezones.includes("UTC")) {
    timezones.unshift("UTC");
  }

  return (
    <>
      <AuthHeading title={say("registerTitle", 0)} subtitle={say("registerSubtitle", 0)} />
      <RegisterForm timezones={timezones} />
    </>
  );
}
