import type { Metadata } from "next";
import { CaseForm } from "@/components/cases/case-form";

export const metadata: Metadata = { title: "New case · Gotham Project" };

export default function NewCasePage() {
  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <h2 className="text-2xl font-semibold tracking-tight">New case</h2>
      <CaseForm />
    </div>
  );
}
