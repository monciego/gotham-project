import type { Metadata } from "next";
import { HabitForm } from "@/components/arsenal/habit-form";

export const metadata: Metadata = { title: "New habit · Gotham Project" };

export default function NewHabitPage() {
  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <h2 className="text-2xl font-semibold tracking-tight">New habit</h2>
      <HabitForm />
    </div>
  );
}
