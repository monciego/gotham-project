"use client";

import { useHabit } from "@/lib/arsenal-queries";
import { HabitFormSkeleton } from "./arsenal-skeletons";
import { DeleteHabit } from "./delete-habit";
import { HabitForm } from "./habit-form";
import { HabitNotFound } from "./habit-not-found";

export function EditHabit({ id }: { id: number }) {
  const { data, isPending, isError } = useHabit(id);

  if (isPending) return <HabitFormSkeleton />;
  if (isError) return <HabitNotFound />;

  return (
    <div className="grid gap-10">
      <HabitForm habit={data.habit} />
      <DeleteHabit habit={data.habit} />
    </div>
  );
}
