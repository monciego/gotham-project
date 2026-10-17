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
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useDeleteMission } from "@/lib/mission-queries";
import type { Mission } from "@/lib/types";

export function DeleteMission({ mission }: { mission: Mission }) {
  const router = useRouter();
  const remove = useDeleteMission(mission.id);
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-xl border border-destructive/30 p-4">
      <h3 className="text-sm font-medium">Delete this mission</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        It disappears from your lists. If you simply won&apos;t do it, abandoning keeps the record.
      </p>
      <Button variant="destructive" className="mt-3" onClick={() => setOpen(true)}>
        <Trash2 aria-hidden />
        Delete mission
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{mission.title}&rdquo;?</DialogTitle>
            <DialogDescription>Its subtasks go with it.</DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => remove.mutate(undefined, { onSuccess: () => router.push("/missions") })}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
