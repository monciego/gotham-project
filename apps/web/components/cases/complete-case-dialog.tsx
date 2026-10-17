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
import { say } from "@/lib/alfred";
import { useCompleteCase } from "@/lib/case-queries";
import type { CaseDetail } from "@/lib/types";

type CompleteCaseDialogProps = {
  item: CaseDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CompleteCaseDialog({ item, open, onOpenChange }: CompleteCaseDialogProps) {
  const complete = useCompleteCase(item.id);
  const remaining = item.analytics.missions_remaining;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Close &ldquo;{item.name}&rdquo;?</DialogTitle>
          <DialogDescription>{say("caseCloseIntro", 0)}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-1 text-sm">
          <p>
            Progress: <span className="font-mono text-primary">{item.progress}%</span>
          </p>
          {remaining > 0 && (
            <p className="text-priority-high">
              {remaining} {remaining === 1 ? "mission is" : "missions are"} still open.
            </p>
          )}
          {item.xp_awarded === 0 && <p className="text-muted-foreground">Closing it earns 500 XP.</p>}
        </div>
        {complete.isError && <p className="text-xs text-destructive">{complete.error.message}</p>}
        <DialogFooter showCloseButton>
          <Button disabled={complete.isPending} onClick={() => complete.mutate(undefined, { onSuccess: () => onOpenChange(false) })}>
            Close the case
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
