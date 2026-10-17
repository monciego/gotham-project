import type { Metadata } from "next";
import { MissionForm } from "@/components/missions/mission-form";

export const metadata: Metadata = { title: "New mission · Gotham Project" };

export default function NewMissionPage() {
  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <h2 className="text-2xl font-semibold tracking-tight">New mission</h2>
      <MissionForm />
    </div>
  );
}
