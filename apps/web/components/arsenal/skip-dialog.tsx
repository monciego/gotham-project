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
import { useSkipHabit } from "@/lib/arsenal-queries";
import type { Habit } from "@/lib/types";

type SkipDialogProps = {
  habit: Habit;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SkipDialog({ habit, open, onOpenChange }: SkipDialogProps) {
  const skip = useSkipHabit();
  const [reason, setReason] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Skip {habit.name} today?</DialogTitle>
          <DialogDescription>{say("skipIntro", 0)}</DialogDescription>
        </DialogHeader>
        <Textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Rest day, travelling, under the weather..."
          aria-label="Reason (optional)"
          maxLength={500}
          rows={3}
        />
        {skip.isError && <p className="text-xs text-destructive">{skip.error.message}</p>}
        <DialogFooter showCloseButton>
          <Button
            variant="secondary"
            disabled={skip.isPending}
            onClick={() =>
              skip.mutate(
                { id: habit.id, reason: reason.trim() || null },
                {
                  onSuccess: () => {
                    setReason("");
                    onOpenChange(false);
                  },
                },
              )
            }
          >
            Skip today
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
