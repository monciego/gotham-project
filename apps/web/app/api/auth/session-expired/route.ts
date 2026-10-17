import { redirect } from "next/navigation";
import { removeToken } from "@/lib/auth";

/**
 * Server components land here when Laravel rejects the token. Without
 * clearing the cookie, proxy.ts would bounce /login straight back.
 */
export async function GET() {
  await removeToken();
  redirect("/login?expired=1");
}
