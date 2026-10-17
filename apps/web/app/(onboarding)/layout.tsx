import { Providers } from "@/components/providers";
import { ThemeSync } from "@/components/shell/theme-sync";

/** First-run setup: centered, no sidebar or header, nothing to wander off to. */
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <ThemeSync />
      <main className="flex min-h-svh items-start justify-center px-4 py-10 sm:items-center sm:py-12">
        <div className="w-full max-w-xl">{children}</div>
      </main>
    </Providers>
  );
}
