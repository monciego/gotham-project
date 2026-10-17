"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@gotham/ui/components/ui/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, LogOut, Settings, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import type { User } from "@/lib/types";
import { useAuthStore } from "@/stores/auth";
import { UserAvatar } from "./user-avatar";

export function UserMenu({ user }: { user: User }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const logout = useAuthStore((state) => state.logout);

  async function handleLogout() {
    await logout();
    // The next person to sign in on this browser mustn't see this user's data.
    queryClient.clear();
    router.replace("/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full py-0.5 pr-2 pl-0.5 transition-colors hover:bg-accent">
        <UserAvatar user={user} />
        <span className="hidden max-w-32 truncate text-sm md:inline">{user.name}</span>
        <ChevronDown className="hidden size-3.5 text-muted-foreground md:block" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => router.push("/settings#profile")}>
            <UserRound aria-hidden />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/settings")}>
            <Settings aria-hidden />
            Settings
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleLogout}>
          <LogOut aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
