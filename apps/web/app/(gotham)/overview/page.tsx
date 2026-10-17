import type { Metadata } from "next";
import { Suspense } from "react";
import { OverviewPage } from "@/components/overview/overview-page";

export const metadata: Metadata = { title: "Overview · Gotham Project" };

export default function Page() {
  // The view is read from the URL on the client.
  return (
    <Suspense>
      <OverviewPage />
    </Suspense>
  );
}
