import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EditMission } from "@/components/missions/edit-mission";

export const metadata: Metadata = { title: "Edit mission · Gotham Project" };

export default async function EditMissionPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) {
    notFound();
  }

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <h2 className="text-2xl font-semibold tracking-tight">Edit mission</h2>
      <EditMission id={id} />
    </div>
  );
}
