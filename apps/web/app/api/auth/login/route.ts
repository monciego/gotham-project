import { setToken } from "@/lib/auth";
import { errorResponse, serverApi } from "@/lib/server-api";
import type { ApiEnvelope, User } from "@/lib/types";

export async function POST(request: Request) {
  const body = await request.json();

  try {
    const { data } = await serverApi.post<ApiEnvelope<{ user: User; token: string }>>(
      "/auth/login",
      body,
    );
    await setToken(data.data.token, { remember: Boolean(body.remember) });

    // The token stays in the cookie; the browser only gets the user.
    return Response.json({ ...data, data: { user: data.data.user } });
  } catch (error) {
    return errorResponse(error);
  }
}
