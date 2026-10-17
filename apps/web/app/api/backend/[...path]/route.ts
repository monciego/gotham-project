import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "@/lib/auth";
import { TOKEN_COOKIE } from "@/lib/auth-cookie";
import type { ApiEnvelope } from "@/lib/types";

/**
 * Same-origin proxy to Laravel for browser code. The browser sends the
 * httpOnly cookie; this route turns it into a Bearer token.
 */
const API_URL = `${process.env.API_INTERNAL_URL}/api/v1`;

// These return a token, so they must go through /api/auth/* to land in the cookie.
const BLOCKED = new Set(["auth/login", "auth/register"]);

function envelope(message: string, status: number) {
  return NextResponse.json(
    { success: false, message, data: null, errors: null } satisfies ApiEnvelope,
    { status },
  );
}

async function forward(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const path = (await params).path.join("/");
  if (BLOCKED.has(path)) {
    return envelope("Not found.", 404);
  }

  const headers = new Headers({ Accept: "application/json" });
  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("Content-Type", contentType);
  }
  const token = await getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${API_URL}/${path}${request.nextUrl.search}`, {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method)
        ? undefined
        : await request.arrayBuffer(),
      cache: "no-store",
    });
  } catch {
    return envelope("Could not reach the server.", 503);
  }

  const response = new NextResponse(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/json",
      // Downloads (exports) name their file.
      ...(upstream.headers.has("content-disposition") && {
        "Content-Disposition": upstream.headers.get("content-disposition")!,
      }),
    },
  });

  const accountDeleted =
    path === "auth/account" && request.method === "DELETE" && upstream.ok;
  if (upstream.status === 401 || accountDeleted) {
    response.cookies.delete(TOKEN_COOKIE);
  }

  return response;
}

export {
  forward as DELETE,
  forward as GET,
  forward as PATCH,
  forward as POST,
  forward as PUT,
};
