import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EditHabit } from "@/components/arsenal/edit-habit";

export const metadata: Metadata = { title: "Edit habit · Gotham Project" };

export default async function EditHabitPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) {
    notFound();
  }

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <h2 className="text-2xl font-semibold tracking-tight">Edit habit</h2>
      <EditHabit id={id} />
    </div>
  );
}
