import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CaseDetailView } from "@/components/cases/case-detail";

export const metadata: Metadata = { title: "Case · Gotham Project" };

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) {
    notFound();
  }

  return <CaseDetailView id={id} />;
}
