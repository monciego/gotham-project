import type { Metadata } from "next";
import { ArsenalPage } from "@/components/arsenal/arsenal-page";

export const metadata: Metadata = { title: "Arsenal · Gotham Project" };

export default function Page() {
  return <ArsenalPage />;
}
