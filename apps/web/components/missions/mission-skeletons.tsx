import { Skeleton } from "@gotham/ui/components/ui/skeleton";

export function MissionListSkeleton() {
  return (
    <div className="grid gap-3" aria-busy="true" aria-label="Loading missions">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
          <div className="grid flex-1 gap-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-7 w-28" />
        </div>
      ))}
    </div>
  );
}

export function MissionDetailSkeleton() {
  return (
    <div className="grid gap-6" aria-busy="true" aria-label="Loading mission">
      <Skeleton className="h-4 w-24" />
      <div className="grid gap-3">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-56" />
      </div>
      <Skeleton className="h-28 w-full rounded-xl" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-9 w-28" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-64 rounded-xl lg:col-span-2" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

export function MissionFormSkeleton() {
  return (
    <div className="grid gap-5" aria-busy="true" aria-label="Loading form">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="grid gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  );
}
