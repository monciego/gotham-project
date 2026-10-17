import type { Metadata } from "next";
import { IntelForm } from "@/components/intel/intel-form";
import { todayIn } from "@/lib/format";
import { getCurrentUser } from "@/lib/server-api";

export const metadata: Metadata = { title: "New Intel · Gotham Project" };

export default async function NewIntelPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const today = todayIn((await getCurrentUser()).timezone);
  const { date } = await searchParams;
  // The calendar links here with ?date= for an empty day.
  const picked = typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= today ? date : today;

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <h2 className="text-2xl font-semibold tracking-tight">New Intel</h2>
      <IntelForm defaultDate={picked} maxDate={today} />
    </div>
  );
}
