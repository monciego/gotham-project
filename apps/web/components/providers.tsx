"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { useState } from "react";
import { ApiError } from "@/lib/api";
import { queryKeys } from "@/lib/queries";
import type { User } from "@/lib/types";

/** These won't succeed on a retry. */
const NO_RETRY = new Set([401, 403, 404, 422]);

type ProvidersProps = {
  children: React.ReactNode;
  /** The signed-in user, when the server already fetched them: seeds `useMe()` so nothing waits on it. */
  user?: User;
};

export function Providers({ children, user }: ProvidersProps) {
  const [queryClient] = useState(() => {
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30_000,
          retry: (failures, error) =>
            !(error instanceof ApiError && NO_RETRY.has(error.status)) && failures < 2,
        },
      },
    });
    if (user) client.setQueryData(queryKeys.me, user);
    return client;
  });

  return (
    <QueryClientProvider client={queryClient}>
      {/* Respects the OS "reduce motion" setting for every animation. */}
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </QueryClientProvider>
  );
}
