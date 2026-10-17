"use client";

import { useCase } from "@/lib/case-queries";
import { CaseForm } from "./case-form";
import { CaseNotFound } from "./case-not-found";
import { CaseFormSkeleton } from "./case-skeletons";
import { DeleteCase } from "./delete-case";

export function EditCase({ id }: { id: number }) {
  const { data: item, isPending, isError } = useCase(id);

  if (isPending) return <CaseFormSkeleton />;
  if (isError) return <CaseNotFound />;

  return (
    <div className="grid gap-10">
      <CaseForm item={item} />
      <DeleteCase item={item} />
    </div>
  );
}
