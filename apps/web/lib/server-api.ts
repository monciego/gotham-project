import "server-only";
import { redirect } from "next/navigation";
import { ApiError, createApiClient } from "./api";
import { getToken } from "./auth";
import type { ApiEnvelope, User } from "./types";

/** For server components and route handlers: calls Laravel directly with the cookie's token. */
export const serverApi = createApiClient({
  baseURL: `${process.env.API_INTERNAL_URL}/api/v1`,
  getToken,
});

/** The signed-in user. An expired or revoked token clears the cookie and goes to /login. */
export async function getCurrentUser(): Promise<User> {
  try {
    const { data } = await serverApi.get<ApiEnvelope<User>>("/auth/me");
    return data.data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      // Server components can't delete cookies, so a route handler does it.
      redirect("/api/auth/session-expired");
    }
    throw error;
  }
}

/** Turns a failed Laravel call into a response with the same envelope and status. */
export function errorResponse(error: unknown): Response {
  const apiError =
    error instanceof ApiError ? error : new ApiError("Something went wrong.", 500);

  return Response.json(
    {
      success: false,
      message: apiError.message,
      data: null,
      errors: Object.keys(apiError.errors).length ? apiError.errors : null,
    } satisfies ApiEnvelope,
    { status: apiError.status || 503 },
  );
}
