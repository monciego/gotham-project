import type { Metadata } from "next";
import { GoalsPage } from "@/components/resources/goals-page";

export const metadata: Metadata = { title: "Savings goals · Gotham Project" };

export default function Page() {
  return <GoalsPage />;
}
