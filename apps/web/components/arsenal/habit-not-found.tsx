import { buttonVariants } from "@gotham/ui/components/ui/button";
import Link from "next/link";
import { say } from "@/lib/alfred";

export function HabitNotFound() {
  return (
    <div className="grid justify-items-center gap-4 rounded-xl border border-border px-6 py-16 text-center">
      <p className="text-lg">{say("habitNotFound", 0)}</p>
      <Link href="/arsenal" className={buttonVariants({ variant: "outline" })}>
        Back to the Arsenal
      </Link>
    </div>
  );
}
