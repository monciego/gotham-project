import type { Metadata } from "next";
import { OperationsCalendar } from "@/components/operations/operations-calendar";

export const metadata: Metadata = { title: "Operations · Gotham Project" };

type OperationsPageProps = { searchParams: Promise<{ date?: string }> };

/** `?date=Y-m-d` opens the calendar on that day (search results link here). */
export default async function OperationsPage({ searchParams }: OperationsPageProps) {
  const { date } = await searchParams;
  const initialDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined;

  // Keyed by the date, so following another result while here moves the calendar.
  return <OperationsCalendar key={initialDate} initialDate={initialDate} />;
}
