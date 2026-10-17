import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HabitDetailView } from "@/components/arsenal/habit-detail";

export const metadata: Metadata = { title: "Habit · Gotham Project" };

export default async function HabitPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) {
    notFound();
  }

  return <HabitDetailView id={id} />;
}
