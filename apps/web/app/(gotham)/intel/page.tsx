import type { Metadata } from "next";
import { IntelPage } from "@/components/intel/intel-page";
import { todayIn } from "@/lib/format";
import { getCurrentUser } from "@/lib/server-api";

export const metadata: Metadata = { title: "Intel · Gotham Project" };

export default async function Page() {
  const user = await getCurrentUser();

  return <IntelPage today={todayIn(user.timezone)} />;
}
