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
import { Loader2 } from "lucide-react";
import { say } from "@/lib/alfred";
import { pluralize } from "./clock";

type EndEarlyDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  minutesWorked: number;
  ending: boolean;
  error: string | null;
  onEnd: () => void;
};

export function EndEarlyDialog({ open, onOpenChange, minutesWorked, ending, error, onEnd }: EndEarlyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{say("focusEndEarly", 0)}</DialogTitle>
          <DialogDescription>
            You&apos;ve worked for {pluralize(minutesWorked, "minute")}. Are you sure?
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="secondary" disabled={ending} onClick={onEnd}>
            {ending && <Loader2 className="animate-spin" aria-hidden />}
            End Session
          </Button>
          <Button autoFocus onClick={() => onOpenChange(false)}>
            Keep Going
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
