"use client";

import { Skeleton } from "@gotham/ui/components/ui/skeleton";
import { X } from "lucide-react";
import { useIntelPrompt } from "@/lib/intel-queries";

export function PromptCard({ onDismiss }: { onDismiss: () => void }) {
  const { data, isPending, isError } = useIntelPrompt();

  if (isError) return null;

  return (
    <aside className="relative rounded-xl border border-primary/40 bg-primary/5 p-4 pr-10" aria-label="Alfred's prompt">
      <p className="text-sm text-primary">💭 Alfred suggests reflecting on:</p>
      {isPending ? (
        <Skeleton className="mt-2 h-5 w-3/4" />
      ) : (
        <p className="mt-1.5 text-lg leading-snug">{data.prompt}</p>
      )}
      <button
        type="button"
        aria-label="Dismiss prompt"
        onClick={onDismiss}
        className="absolute top-3 right-3 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <X className="size-4" aria-hidden />
      </button>
    </aside>
  );
}
