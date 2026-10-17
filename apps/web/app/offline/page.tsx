import { BracketCard } from "@gotham/ui/components/bracket-card";
import type { Metadata } from "next";
import { say } from "@/lib/alfred";

export const metadata: Metadata = { title: "Offline · Gotham Project" };

/** What the service worker shows when a page can't load without a connection. */
export default function OfflinePage() {
  return (
    <main className="grid min-h-svh place-items-center p-4">
      <BracketCard className="max-w-sm p-8 text-center">
        <p className="font-mono text-xs tracking-[0.3em] text-primary">OFFLINE</p>
        <p className="mt-3 text-muted-foreground">{say("offline", 0)}</p>
      </BracketCard>
    </main>
  );
}
