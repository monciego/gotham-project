import { Button } from "@gotham/ui/components/ui/button";
import { Loader2 } from "lucide-react";

type SubmitButtonProps = {
  loading: boolean;
  children: React.ReactNode;
};

export function SubmitButton({ loading, children }: SubmitButtonProps) {
  return (
    <Button type="submit" size="lg" className="w-full" disabled={loading} aria-busy={loading}>
      {loading && <Loader2 className="animate-spin" aria-hidden />}
      {children}
    </Button>
  );
}
