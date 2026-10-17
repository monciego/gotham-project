import type { Metadata } from "next";
import { CasesPage } from "@/components/cases/cases-page";

export const metadata: Metadata = { title: "Cases · Gotham Project" };

export default function Page() {
  return <CasesPage />;
}
