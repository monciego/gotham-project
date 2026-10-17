import { redirect } from "next/navigation";
import { AlfredAlerts } from "@/components/alfred/alfred-alerts";
import { CommandHost } from "@/components/command/command-host";
import { ProgressCelebration } from "@/components/cases/progress-celebration";
import { RewardsHost } from "@/components/trophies/rewards-host";
import { Providers } from "@/components/providers";
import { AlfredHost } from "@/components/shell/alfred-host";
import { Header } from "@/components/shell/header";
import { Sidebar } from "@/components/shell/sidebar";
import { ThemeSync } from "@/components/shell/theme-sync";
import { getCurrentUser } from "@/lib/server-api";

export default async function GothamLayout({ children }: { children: React.ReactNode }) {
  // New accounts set up with Alfred first.
  if (!(await getCurrentUser()).onboarding_completed) {
    redirect("/onboarding");
  }

  return (
    <Providers>
      <Sidebar />
      {/* Matches the sidebar: icon-only (4rem) on small screens, 256px from md up. */}
      <div className="min-h-svh pl-16 md:pl-64">
        <Header />
        <main className="mx-auto max-w-6xl p-4 md:p-8">
          <AlfredAlerts />
          {children}
        </main>
      </div>
      <AlfredHost />
      <ProgressCelebration />
      <RewardsHost />
      <CommandHost />
      <ThemeSync />
    </Providers>
  );
}
