import type { Metadata } from "next";
import { OperationsCalendar } from "@/components/operations/operations-calendar";

export const metadata: Metadata = { title: "Operations · Gotham Project" };

export default function OperationsPage() {
  return <OperationsCalendar />;
}
