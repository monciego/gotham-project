import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FocusScreen } from "@/components/focus/focus-screen";

export const metadata: Metadata = { title: "Focus · Gotham Project" };

export default async function FocusPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const id = Number((await params).sessionId);
  if (!Number.isInteger(id)) {
    notFound();
  }

  return <FocusScreen id={id} />;
}
