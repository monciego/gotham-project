import type { Metadata } from "next";
import { OverviewPage } from "@/components/overview/overview-page";

export const metadata: Metadata = { title: "Overview · Gotham Project" };

export default function Page() {
  return <OverviewPage />;
}
