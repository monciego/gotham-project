import type { Metadata } from "next";
import { TrophiesPage } from "@/components/trophies/trophies-page";

export const metadata: Metadata = { title: "Trophies · Gotham Project" };

export default function Page() {
  return <TrophiesPage />;
}
