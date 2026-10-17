import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MissionDetailView } from "@/components/missions/mission-detail";

export const metadata: Metadata = { title: "Mission · Gotham Project" };

export default async function MissionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) {
    notFound();
  }

  const { breakdown } = await searchParams;

  return <MissionDetailView id={id} openBreakdown={breakdown === "1"} />;
}
