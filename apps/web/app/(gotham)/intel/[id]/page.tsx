import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IntelView } from "@/components/intel/intel-view";

export const metadata: Metadata = { title: "Intel · Gotham Project" };

export default async function IntelEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) {
    notFound();
  }

  return <IntelView id={id} />;
}
