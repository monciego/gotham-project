import "server-only";
import { cookies } from "next/headers";
import { TOKEN_COOKIE } from "./auth-cookie";

const REMEMBER_MAX_AGE = 60 * 60 * 24 * 30; // matches the 30-day token Laravel issues

/**
 * The Sanctum token lives only in an httpOnly cookie, so browser JavaScript
 * never sees it. Server code reads it here and sends it as a Bearer token.
 */
export async function getToken(): Promise<string | undefined> {
  return (await cookies()).get(TOKEN_COOKIE)?.value;
}

/** Without `remember` the cookie ends with the browser session. */
export async function setToken(token: string, { remember = false } = {}) {
  (await cookies()).set(TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(remember ? { maxAge: REMEMBER_MAX_AGE } : {}),
  });
}

export async function removeToken() {
  (await cookies()).delete(TOKEN_COOKIE);
}
