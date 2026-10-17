import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EditIntel } from "@/components/intel/edit-intel";
import { todayIn } from "@/lib/format";
import { getCurrentUser } from "@/lib/server-api";

export const metadata: Metadata = { title: "Edit Intel · Gotham Project" };

export default async function EditIntelPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) {
    notFound();
  }
  const today = todayIn((await getCurrentUser()).timezone);

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <h2 className="text-2xl font-semibold tracking-tight">Edit Intel</h2>
      <EditIntel id={id} maxDate={today} />
    </div>
  );
}
