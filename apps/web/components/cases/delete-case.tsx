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
import { useDeleteCase } from "@/lib/case-queries";
import type { Case } from "@/lib/types";

export function DeleteCase({ item }: { item: Case }) {
  const router = useRouter();
  const remove = useDeleteCase(item.id);
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-xl border border-destructive/30 p-4">
      <h3 className="text-sm font-medium">Delete this case</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        It disappears from your lists. Its missions stay, without a case. To keep the record, archive it instead.
      </p>
      <Button variant="destructive" className="mt-3" onClick={() => setOpen(true)}>
        <Trash2 aria-hidden />
        Delete case
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{item.name}&rdquo;?</DialogTitle>
            <DialogDescription>Its milestones go with it. Its missions stay.</DialogDescription>
          </DialogHeader>
          {remove.isError && <p className="text-xs text-destructive">{remove.error.message}</p>}
          <DialogFooter showCloseButton>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => remove.mutate(undefined, { onSuccess: () => router.push("/cases") })}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
