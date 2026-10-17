import { BracketCard } from "@gotham/ui/components/bracket-card";
import type { Metadata } from "next";
import { LogoutButton } from "@/components/auth/logout-button";
import { say } from "@/lib/alfred";
import { getCurrentUser } from "@/lib/server-api";

export const metadata: Metadata = { title: "HQ · Gotham Project" };

export default async function HqPage() {
  const user = await getCurrentUser();

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col justify-center gap-6 px-4 py-12">
      <BracketCard className="p-6 sm:p-8">
        <p className="font-mono text-xs tracking-[0.4em] text-primary">HQ</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">{say("greeting")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Signed in as {user.name} ({user.email})
        </p>

        <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-border pt-6">
          <div>
            <dt className="text-xs text-muted-foreground">Level</dt>
            <dd className="font-mono text-2xl text-primary">{user.current_level}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">XP</dt>
            <dd className="font-mono text-2xl">{user.total_xp}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Mode</dt>
            <dd className="text-2xl capitalize">{user.current_mode}</dd>
          </div>
        </dl>
      </BracketCard>

      <div className="flex justify-end">
        <LogoutButton />
      </div>
    </main>
  );
}
