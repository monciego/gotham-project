"use client";

import { Button } from "@gotham/ui/components/ui/button";
import { cn } from "@gotham/ui/lib/utils";
import { Loader2, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useStartSession } from "@/lib/mission-queries";

type StartSessionButtonProps = {
  missionId: number;
  variant?: "default" | "outline";
  size?: "sm" | "default" | "lg";
  className?: string;
  /** Hides the label below the sm breakpoint. */
  compactLabel?: boolean;
  children?: React.ReactNode;
};

/** Starts a 25-minute focus session and opens the mission, where the timer runs. */
export function StartSessionButton({
  missionId,
  variant = "outline",
  size = "sm",
  className,
  compactLabel,
  children = "Start Session",
}: StartSessionButtonProps) {
  const router = useRouter();
  const start = useStartSession();

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      disabled={start.isPending}
      onClick={(event) => {
        // Cards are links; this button shouldn't also follow the link.
        event.preventDefault();
        event.stopPropagation();
        start.mutate({ missionId }, { onSuccess: () => router.push(`/missions/${missionId}`) });
      }}
    >
      {start.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <Play aria-hidden />}
      <span className={cn(compactLabel && "hidden sm:inline")}>{children}</span>
    </Button>
  );
}
