"use client";

import { Button } from "@gotham/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@gotham/ui/components/ui/dialog";
import { Textarea } from "@gotham/ui/components/ui/textarea";
import { useState } from "react";
import { say } from "@/lib/alfred";
import { useAbandonMission } from "@/lib/mission-queries";
import { useAlfredStore } from "@/stores/alfred";

type AbandonDialogProps = {
  missionId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AbandonDialog({ missionId, open, onOpenChange }: AbandonDialogProps) {
  const abandon = useAbandonMission(missionId);
  const alfredSays = useAlfredStore((state) => state.say);
  const [reason, setReason] = useState("");
  const tooShort = reason.trim().length < 3;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Abandon this mission?</DialogTitle>
          <DialogDescription>
            There&apos;s no shame in it. Tell Alfred why, so future-you understands.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="It no longer matters because..."
          aria-label="Reason"
          rows={3}
        />
        {abandon.isError && <p className="text-xs text-destructive">{abandon.error.message}</p>}
        <DialogFooter showCloseButton>
          <Button
            variant="destructive"
            disabled={tooShort || abandon.isPending}
            onClick={() =>
              abandon.mutate(reason.trim(), {
                onSuccess: () => {
                  onOpenChange(false);
                  alfredSays({ mood: "encouraging", title: say("missionAbandoned", 0), message: reason.trim() });
                },
              })
            }
          >
            Abandon mission
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
