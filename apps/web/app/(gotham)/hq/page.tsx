import type { Metadata } from "next";
import { HqDashboard } from "@/components/hq/hq-dashboard";

export const metadata: Metadata = { title: "HQ · Gotham Project" };

export default function HqPage() {
  return <HqDashboard />;
}
