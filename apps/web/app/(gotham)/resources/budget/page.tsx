import type { Metadata } from "next";
import { BudgetPage } from "@/components/resources/budget-page";

export const metadata: Metadata = { title: "Budget · Gotham Project" };

export default function Page() {
  return <BudgetPage />;
}
