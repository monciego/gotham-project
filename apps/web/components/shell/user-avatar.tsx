import { cn } from "@gotham/ui/lib/utils";
import type { User } from "@/lib/types";

export function UserAvatar({ user, className }: { user: User; className?: string }) {
  const initials = user.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return user.avatar_url ? (
    // Avatars are served by Laravel's storage, outside next/image's configured hosts.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={user.avatar_url}
      alt=""
      className={cn("size-8 shrink-0 rounded-full object-cover", className)}
    />
  ) : (
    <span
      aria-hidden
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium",
        className,
      )}
    >
      {initials}
    </span>
  );
}
