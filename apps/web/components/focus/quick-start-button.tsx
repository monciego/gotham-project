"use client";

import { Button } from "@gotham/ui/components/ui/button";
import { cn } from "@gotham/ui/lib/utils";
import { Loader2, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { say } from "@/lib/alfred";
import { useStartFocusSession } from "@/lib/focus-queries";
import { useAlfredStore } from "@/stores/alfred";

type QuickStartButtonProps = {
  /** Leave out for a session that isn't on a mission. */
  missionId?: number;
  variant?: "default" | "outline";
  size?: "sm" | "default" | "lg";
  className?: string;
  /** Hides the label below the sm breakpoint. */
  compactLabel?: boolean;
  children?: React.ReactNode;
};

/** One click: starts a 25-minute session and opens the focus screen. */
export function QuickStartButton({
  missionId,
  variant = "outline",
  size = "sm",
  className,
  compactLabel,
  children = "Start 25-min Session",
}: QuickStartButtonProps) {
  const router = useRouter();
  const start = useStartFocusSession();
  const [navigating, startTransition] = useTransition();
  const busy = start.isPending || navigating;

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      disabled={busy}
      onClick={(event) => {
        // Cards are links; this button shouldn't also follow the link.
        event.preventDefault();
        event.stopPropagation();
        start.mutate(
          { missionId },
          {
            onSuccess: (session) => startTransition(() => router.push(`/focus/${session.id}`)),
            onError: (error) =>
              useAlfredStore.getState().say({
                mood: "concerned",
                title: say("sessionStartFailed", 0),
                message: error.message,
              }),
          },
        );
      }}
    >
      {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Play aria-hidden />}
      <span className={cn(compactLabel && "hidden sm:inline")}>{children}</span>
    </Button>
  );
}
