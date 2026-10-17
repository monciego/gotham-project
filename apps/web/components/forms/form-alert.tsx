import { cn } from "@gotham/ui/lib/utils";

type FormAlertProps = {
  tone?: "error" | "success";
  children: React.ReactNode;
};

export function FormAlert({ tone = "error", children }: FormAlertProps) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-lg border px-3 py-2 text-sm",
        tone === "error"
          ? "border-destructive/40 bg-destructive/10 text-destructive dark:text-red-300"
          : "border-primary/40 bg-primary/10 text-primary",
      )}
    >
      {children}
    </p>
  );
}
