"use client";

import { useMission } from "@/lib/mission-queries";
import { DeleteMission } from "./delete-mission";
import { MissionForm } from "./mission-form";
import { MissionNotFound } from "./mission-not-found";
import { MissionFormSkeleton } from "./mission-skeletons";

export function EditMission({ id }: { id: number }) {
  const { data: mission, isPending, isError } = useMission(id);

  if (isPending) return <MissionFormSkeleton />;
  if (isError) return <MissionNotFound />;

  return (
    <div className="grid gap-10">
      <MissionForm mission={mission} />
      <DeleteMission mission={mission} />
    </div>
  );
}
