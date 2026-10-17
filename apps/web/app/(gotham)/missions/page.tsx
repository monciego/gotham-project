import type { Metadata } from "next";
import { MissionsPage } from "@/components/missions/missions-page";

export const metadata: Metadata = { title: "Missions · Gotham Project" };

export default function Page() {
  return <MissionsPage />;
}
