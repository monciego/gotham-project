import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { HOME } from "@/lib/routes";
import { getCurrentUser } from "@/lib/server-api";

export const metadata: Metadata = { title: "Welcome · Gotham Project" };

export default async function Page() {
  const user = await getCurrentUser();
  if (user.onboarding_completed) {
    redirect(HOME);
  }

  return <OnboardingFlow user={user} />;
}
