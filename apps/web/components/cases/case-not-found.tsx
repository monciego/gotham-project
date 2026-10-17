import { buttonVariants } from "@gotham/ui/components/ui/button";
import Link from "next/link";
import { say } from "@/lib/alfred";

export function CaseNotFound() {
  return (
    <div className="grid justify-items-center gap-4 rounded-xl border border-dashed border-border px-6 py-16 text-center">
      <p className="text-lg">{say("caseNotFound", 0)}</p>
      <Link href="/cases" className={buttonVariants({ variant: "outline" })}>
        Back to Cases
      </Link>
    </div>
  );
}
