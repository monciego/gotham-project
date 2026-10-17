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
import { useDeleteHabit } from "@/lib/arsenal-queries";
import type { Habit } from "@/lib/types";

export function DeleteHabit({ habit }: { habit: Habit }) {
  const router = useRouter();
  const remove = useDeleteHabit(habit.id);
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-xl border border-destructive/30 p-4">
      <h3 className="text-sm font-medium">Delete this habit</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        It disappears from the Arsenal. To pause it and keep its history, switch off Active instead.
      </p>
      <Button variant="destructive" className="mt-3" onClick={() => setOpen(true)}>
        <Trash2 aria-hidden />
        Delete habit
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{habit.name}&rdquo;?</DialogTitle>
            <DialogDescription>Its streak and history go with it.</DialogDescription>
          </DialogHeader>
          {remove.isError && <p className="text-xs text-destructive">{remove.error.message}</p>}
          <DialogFooter showCloseButton>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => remove.mutate(undefined, { onSuccess: () => router.push("/arsenal") })}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
