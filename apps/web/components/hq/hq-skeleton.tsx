import { Skeleton } from "@gotham/ui/components/ui/skeleton";

/** Mirrors the HQ layout so nothing jumps when the data arrives. */
export function HqSkeleton() {
  return (
    <div className="grid gap-6" aria-busy="true" aria-label="Loading HQ">
      <div className="rounded-xl border border-border bg-card p-6 md:p-8">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-3 h-8 w-64" />
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_18rem]">
          <div className="grid gap-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="mt-2 h-11 w-full" />
          </div>
          <div className="grid gap-3">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-8 w-full" />
            ))}
          </div>
        </div>
        <Skeleton className="mt-8 h-4 w-2/3" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="rounded-xl border border-border bg-card p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-4 h-10 w-24" />
            <Skeleton className="mt-3 h-4 w-32" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, card) => (
          <div key={card} className="rounded-xl border border-border bg-card p-5">
            <Skeleton className="h-3 w-32" />
            {Array.from({ length: 4 }, (_, row) => (
              <Skeleton key={row} className="mt-4 h-8 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
