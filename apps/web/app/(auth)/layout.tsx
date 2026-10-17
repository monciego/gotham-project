import { BracketCard } from "@gotham/ui/components/bracket-card";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <p className="mb-8 text-center font-mono text-xs tracking-[0.4em] text-primary">
          GOTHAM
        </p>
        <BracketCard className="p-6 sm:p-8">{children}</BracketCard>
      </div>
    </main>
  );
}
