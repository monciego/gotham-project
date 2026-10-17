"use client";

import { buttonVariants } from "@gotham/ui/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@gotham/ui/components/ui/dialog";
import { BookOpen, ListTree, Timer } from "lucide-react";
import Link from "next/link";
import { QuickStartButton } from "@/components/focus/quick-start-button";
import { useAlfredStore } from "@/stores/alfred";

/** "I'm stuck, Alfred": the smallest ways back in. */
export function HelpDialog() {
  const help = useAlfredStore((state) => state.help);
  const close = useAlfredStore((state) => state.closeHelp);
  const mission = help?.mission ?? null;

  return (
    <Dialog open={help !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Stuck happens, sir.</DialogTitle>
          <DialogDescription>
            Nobody starts by finishing. Pick the smallest thing below and do only that.
          </DialogDescription>
        </DialogHeader>

        <ul className="grid gap-3 text-sm">
          {mission && (
            <li className="grid gap-2 rounded-lg border border-border p-3">
              <p>
                <span className="text-muted-foreground">Most urgent:</span> <span className="font-medium">{mission.title}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/missions/${mission.id}?breakdown=1`}
                  onClick={close}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  <ListTree aria-hidden />
                  Break it down
                </Link>
                <QuickStartButton missionId={mission.id} />
              </div>
            </li>
          )}
          <li className="flex items-start gap-3 rounded-lg border border-border p-3">
            <Timer className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <p>Set a timer for five minutes. You may stop when it rings. You won&apos;t want to.</p>
          </li>
          <li className="flex items-start gap-3 rounded-lg border border-border p-3">
            <BookOpen className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <p>
              Write down what&apos;s in the way.{" "}
              <Link href="/intel/new" onClick={close} className="text-primary hover:underline">
                Open Intel
              </Link>
              . Named obstacles shrink.
            </p>
          </li>
        </ul>
      </DialogContent>
    </Dialog>
  );
}
