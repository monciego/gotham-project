import { setToken } from "@/lib/auth";
import { errorResponse, serverApi } from "@/lib/server-api";
import type { ApiEnvelope, User } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const { data } = await serverApi.post<ApiEnvelope<{ user: User; token: string }>>(
      "/auth/register",
      await request.json(),
    );
    await setToken(data.data.token);

    return Response.json(
      { ...data, data: { user: data.data.user } },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
