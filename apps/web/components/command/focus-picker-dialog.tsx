"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@gotham/ui/components/ui/dialog";
import { Skeleton } from "@gotham/ui/components/ui/skeleton";
import { cn } from "@gotham/ui/lib/utils";
import { Loader2, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PriorityBadge } from "@/components/missions/priority-badge";
import { say } from "@/lib/alfred";
import { useStartFocusSession } from "@/lib/focus-queries";
import { useMissionOptions } from "@/lib/mission-queries";
import { useAlfredStore } from "@/stores/alfred";
import { useCommandStore } from "@/stores/command";

/** Ctrl/⌘ F: pick an open mission (or none) and start a 25-minute session on it. */
export function FocusPickerDialog() {
  const open = useCommandStore((state) => state.open === "focus");
  const close = useCommandStore((state) => state.close);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start a focus session</DialogTitle>
          <DialogDescription>{say("focusPickerIntro", 0)}</DialogDescription>
        </DialogHeader>
        {open && <MissionList onClose={close} />}
      </DialogContent>
    </Dialog>
  );
}

function MissionList({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { data: missions, isPending } = useMissionOptions();
  const start = useStartFocusSession();
  const [chosen, setChosen] = useState<number | null | undefined>(undefined);
  const [navigating, startTransition] = useTransition();

  function begin(missionId: number | null) {
    setChosen(missionId);
    start.mutate(
      { missionId },
      {
        onSuccess: (session) => {
          onClose();
          startTransition(() => router.push(`/focus/${session.id}`));
        },
        onError: (error) =>
          useAlfredStore.getState().say({ mood: "concerned", title: say("sessionStartFailed", 0), message: error.message }),
      },
    );
  }

  const busy = start.isPending || navigating;
  const options = [
    ...(missions ?? []).slice(0, 8).map((mission) => ({ id: mission.id as number | null, mission })),
    { id: null, mission: null },
  ];

  return (
    <ul className="-mx-1 grid max-h-80 gap-1 overflow-y-auto">
      {isPending &&
        [0, 1, 2].map((row) => (
          <li key={row} className="px-3 py-2">
            <Skeleton className="h-4 w-3/4" />
          </li>
        ))}
      {!isPending &&
        options.map(({ id, mission }, index) => (
          <li key={id ?? "none"}>
            <button
              type="button"
              autoFocus={index === 0}
              disabled={busy}
              onClick={() => begin(id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors duration-150 hover:bg-accent focus-visible:bg-accent focus-visible:outline-none disabled:opacity-60",
                !mission && "text-muted-foreground",
              )}
            >
              {mission ? <PriorityBadge priority={mission.priority} /> : <Play className="size-4" aria-hidden />}
              <span className="min-w-0 flex-1 truncate">{mission ? mission.title : "No mission, just focus"}</span>
              {busy && chosen === id && <Loader2 className="size-4 animate-spin" aria-hidden />}
            </button>
          </li>
        ))}
    </ul>
  );
}
