import { Skeleton } from "@gotham/ui/components/ui/skeleton";

export function EntryListSkeleton() {
  return (
    <div className="grid gap-3" aria-busy>
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className="h-24 rounded-xl" />
      ))}
    </div>
  );
}

export function EntrySkeleton() {
  return (
    <div className="mx-auto grid max-w-3xl gap-6" aria-busy>
      <Skeleton className="h-9 w-80" />
      <div className="grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-20 rounded-xl" />
      </div>
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}

export function IntelFormSkeleton() {
  return (
    <div className="grid gap-6" aria-busy>
      <Skeleton className="h-9 w-44" />
      <Skeleton className="h-56 rounded-lg" />
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-14" />
    </div>
  );
}
