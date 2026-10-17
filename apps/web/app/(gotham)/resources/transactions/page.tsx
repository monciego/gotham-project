import type { Metadata } from "next";
import { TransactionsPage } from "@/components/resources/transactions-page";

export const metadata: Metadata = { title: "Transactions · Gotham Project" };

export default function Page() {
  return <TransactionsPage />;
}
