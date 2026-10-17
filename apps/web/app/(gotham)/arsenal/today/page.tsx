import type { Metadata } from "next";
import { ArsenalToday } from "@/components/arsenal/arsenal-today";

export const metadata: Metadata = { title: "Today's Arsenal · Gotham Project" };

export default function TodayPage() {
  return <ArsenalToday />;
}
