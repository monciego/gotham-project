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
import { Input } from "@gotham/ui/components/ui/input";
import { useState } from "react";
import { useUpdateMission } from "@/lib/mission-queries";
import type { Mission } from "@/lib/types";

type ScheduleDialogProps = {
  mission: Mission;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Sets when the mission is due. Calendar blocks arrive with Operations. */
export function ScheduleDialog({ mission, open, onOpenChange }: ScheduleDialogProps) {
  const update = useUpdateMission(mission.id);
  const [date, setDate] = useState(mission.due_date);
  const [time, setTime] = useState(mission.due_time ?? "");
  const later = date > mission.due_date;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setDate(mission.due_date);
          setTime(mission.due_time ?? "");
        }
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule</DialogTitle>
          <DialogDescription>When will you take this on, sir?</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-label="Date" />
          <Input type="time" value={time} onChange={(event) => setTime(event.target.value)} aria-label="Time" />
        </div>
        {later && (
          <p className="text-xs text-amber-400">Moving it later counts as postponing, sir. Alfred keeps count.</p>
        )}
        {update.isError && <p className="text-xs text-destructive">{update.error.message}</p>}
        <DialogFooter showCloseButton>
          <Button
            disabled={!date || update.isPending}
            onClick={() =>
              update.mutate({ due_date: date, due_time: time || null }, { onSuccess: () => onOpenChange(false) })
            }
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
