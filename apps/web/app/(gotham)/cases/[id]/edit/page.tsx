import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EditCase } from "@/components/cases/edit-case";

export const metadata: Metadata = { title: "Edit case · Gotham Project" };

export default async function EditCasePage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) {
    notFound();
  }

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <h2 className="text-2xl font-semibold tracking-tight">Edit case</h2>
      <EditCase id={id} />
    </div>
  );
}
