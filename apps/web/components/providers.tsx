"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { useState } from "react";
import { ApiError } from "@/lib/api";

/** These won't succeed on a retry. */
const NO_RETRY = new Set([401, 403, 404, 422]);

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: (failures, error) =>
              !(error instanceof ApiError && NO_RETRY.has(error.status)) && failures < 2,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {/* Respects the OS "reduce motion" setting for every animation. */}
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </QueryClientProvider>
  );
}
