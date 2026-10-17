import { removeToken } from "@/lib/auth";
import { serverApi } from "@/lib/server-api";
import type { ApiEnvelope } from "@/lib/types";

export async function POST() {
  try {
    await serverApi.post("/auth/logout");
  } catch {
    // The token may already be expired or revoked. Clearing the cookie is what matters.
  }
  await removeToken();

  return Response.json({
    success: true,
    message: "Logged out.",
    data: null,
    errors: null,
  } satisfies ApiEnvelope);
}
