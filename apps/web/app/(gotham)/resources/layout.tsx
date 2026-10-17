import { ResourcesNav } from "@/components/resources/resources-nav";
import { todayIn } from "@/lib/format";
import { getCurrentUser } from "@/lib/server-api";

export default async function ResourcesLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="grid gap-6">
      <ResourcesNav today={todayIn(user.timezone)} />
      {children}
    </div>
  );
}
