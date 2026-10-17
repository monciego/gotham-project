import { cn } from "@gotham/ui/lib/utils";

/** A native <select> styled like the shared Input. Native keeps long lists usable on mobile. */
export function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-8 rounded-lg border border-input bg-input/30 px-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive [&>option]:bg-card",
        className,
      )}
      {...props}
    />
  );
}
