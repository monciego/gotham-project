import type { Metadata } from "next";
import { AuthHeading } from "@/components/auth/auth-heading";
import { LoginForm } from "@/components/auth/login-form";
import { say } from "@/lib/alfred";
import { safeNext } from "@/lib/routes";

export const metadata: Metadata = { title: "Sign in · Gotham Project" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const notice = params.expired
    ? say("sessionExpired", 0)
    : params.reset
      ? say("resetDone", 0)
      : null;

  return (
    <>
      <AuthHeading title={say("loginTitle", 0)} subtitle={say("loginSubtitle", 0)} />
      <LoginForm next={safeNext(params.next)} notice={notice} />
    </>
  );
}
