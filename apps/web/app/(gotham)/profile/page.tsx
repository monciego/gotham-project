import { redirect } from "next/navigation";

/** The profile lives at the top of Settings. */
export default function Page() {
  redirect("/settings#profile");
}
