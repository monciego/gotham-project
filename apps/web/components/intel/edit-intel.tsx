"use client";

import { useIntelEntry } from "@/lib/intel-queries";
import { DeleteIntel } from "./delete-intel";
import { IntelForm } from "./intel-form";
import { IntelNotFound } from "./intel-not-found";
import { IntelFormSkeleton } from "./intel-skeletons";

export function EditIntel({ id, maxDate }: { id: number; maxDate: string }) {
  const { data, isPending, isError } = useIntelEntry(id);

  if (isPending) return <IntelFormSkeleton />;
  if (isError) return <IntelNotFound />;

  return (
    <div className="grid gap-10">
      <IntelForm entry={data.entry} defaultDate={data.entry.date} maxDate={maxDate} />
      <DeleteIntel entry={data.entry} />
    </div>
  );
}
