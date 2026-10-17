import { buttonVariants } from "@gotham/ui/components/ui/button";
import Link from "next/link";

export function IntelNotFound() {
  return (
    <div className="grid justify-items-center gap-4 rounded-xl border border-border px-6 py-16 text-center">
      <p className="text-lg">I can&apos;t find that entry, sir.</p>
      <Link href="/intel" className={buttonVariants({ variant: "outline" })}>
        Back to Intel
      </Link>
    </div>
  );
}
