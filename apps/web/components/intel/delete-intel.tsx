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
import { useDeleteIntel } from "@/lib/intel-queries";
import type { IntelEntry } from "@/lib/types";
import { longDate } from "./moods";

export function DeleteIntel({ entry }: { entry: IntelEntry }) {
  const router = useRouter();
  const remove = useDeleteIntel(entry.id);
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-xl border border-destructive/30 p-4">
      <h3 className="text-sm font-medium">Delete this entry</h3>
      <p className="mt-1 text-sm text-muted-foreground">It&apos;s gone for good, along with the 5 XP it earned.</p>
      <Button variant="destructive" className="mt-3" onClick={() => setOpen(true)}>
        <Trash2 aria-hidden />
        Delete entry
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Intel for {longDate(entry.date)}?</DialogTitle>
            <DialogDescription>This can&apos;t be undone.</DialogDescription>
          </DialogHeader>
          {remove.isError && <p className="text-xs text-destructive">{remove.error.message}</p>}
          <DialogFooter showCloseButton>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => remove.mutate(undefined, { onSuccess: () => router.push("/intel") })}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
