"use client";

import { Button } from "@gotham/ui/components/ui/button";
import { cn } from "@gotham/ui/lib/utils";
import { Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { TransactionDialog } from "./transaction-dialog";

const TABS = [
  { href: "/resources", label: "Overview" },
  { href: "/resources/transactions", label: "Transactions" },
  { href: "/resources/budget", label: "Budget" },
  { href: "/resources/goals", label: "Goals" },
];

/** The Resources tabs and the Quick Add button, above every Resources page. */
export function ResourcesNav({ today }: { today: string }) {
  const pathname = usePathname();
  const [adding, setAdding] = useState(false);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold tracking-tight">Resources</h2>
        <Button onClick={() => setAdding(true)}>
          <Plus aria-hidden />
          Quick Add
        </Button>
      </div>
      <nav aria-label="Resources" className="flex gap-1 border-b border-border">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "-mb-px border-b-2 px-3 py-2 text-sm whitespace-nowrap transition-colors duration-200",
                active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      <TransactionDialog open={adding} onOpenChange={setAdding} today={today} />
    </div>
  );
}
