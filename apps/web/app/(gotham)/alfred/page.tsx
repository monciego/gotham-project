import type { Metadata } from "next";
import { AlfredMessagesPage } from "@/components/alfred/alfred-messages-page";

export const metadata: Metadata = { title: "Alfred · Gotham Project" };

export default function Page() {
  return <AlfredMessagesPage />;
}
