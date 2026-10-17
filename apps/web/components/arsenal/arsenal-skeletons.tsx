import { Skeleton } from "@gotham/ui/components/ui/skeleton";

export function HabitGridSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2" aria-busy>
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className="h-40 rounded-xl" />
      ))}
    </div>
  );
}

export function CheckInSkeleton() {
  return (
    <div className="grid gap-3" aria-busy>
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className="h-20 rounded-xl" />
      ))}
    </div>
  );
}

export function HabitDetailSkeleton() {
  return (
    <div className="grid gap-6" aria-busy>
      <Skeleton className="h-10 w-72" />
      <div className="grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
      <Skeleton className="h-44 rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

export function HabitFormSkeleton() {
  return (
    <div className="grid gap-5" aria-busy>
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-14" />
      ))}
    </div>
  );
}
