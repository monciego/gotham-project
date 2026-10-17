import type { Metadata } from "next";
import { ResourcesDashboard } from "@/components/resources/resources-dashboard";

export const metadata: Metadata = { title: "Resources · Gotham Project" };

export default function ResourcesPage() {
  return <ResourcesDashboard />;
}
