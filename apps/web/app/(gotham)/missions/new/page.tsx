import type { Metadata } from "next";
import { MissionForm } from "@/components/missions/mission-form";

export const metadata: Metadata = { title: "New mission · Gotham Project" };

export default async function NewMissionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // "Add Mission to Case" links here with ?case=<id>.
  const caseId = Number((await searchParams).case);

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <h2 className="text-2xl font-semibold tracking-tight">New mission</h2>
      <MissionForm caseId={Number.isInteger(caseId) && caseId > 0 ? caseId : undefined} />
    </div>
  );
}
