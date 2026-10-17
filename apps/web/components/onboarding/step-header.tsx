import { Button } from "@gotham/ui/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";

export function StepHeader({ eyebrow, title, intro }: { eyebrow: string; title: string; intro?: string }) {
  return (
    <div className="mb-6">
      <p className="font-mono text-xs tracking-[0.3em] text-primary">{eyebrow}</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h1>
      {intro && <p className="mt-2 text-sm text-muted-foreground">{intro}</p>}
    </div>
  );
}

type StepNavProps = {
  onBack?: () => void;
  /** Omit to render the continue button as the form's submit. */
  onNext?: () => void;
  nextLabel?: string;
  disabled?: boolean;
  busy?: boolean;
  error?: string | null;
};

/** Back on the left, continue on the right. */
export function StepNav({ onBack, onNext, nextLabel = "Continue", disabled, busy, error }: StepNavProps) {
  return (
    <div className="mt-8">
      {error && (
        <p role="alert" className="mb-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex items-center justify-between gap-3">
        {onBack ? (
          <Button type="button" variant="ghost" onClick={onBack} disabled={busy}>
            <ArrowLeft aria-hidden />
            Back
          </Button>
        ) : (
          <span />
        )}
        <Button
          type={onNext ? "button" : "submit"}
          size="lg"
          onClick={onNext}
          disabled={disabled || busy}
          className="min-w-32"
        >
          {busy && <Loader2 className="animate-spin" aria-hidden />}
          {nextLabel}
        </Button>
      </div>
    </div>
  );
}
