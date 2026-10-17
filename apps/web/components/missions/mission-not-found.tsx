import { buttonVariants } from "@gotham/ui/components/ui/button";
import Link from "next/link";

export function MissionNotFound() {
  return (
    <div className="rounded-xl border border-border bg-card p-8 text-center">
      <p className="text-muted-foreground">That mission isn&apos;t on file, sir.</p>
      <Link href="/missions" className={buttonVariants({ variant: "outline", className: "mt-4" })}>
        Back to missions
      </Link>
    </div>
  );
}
