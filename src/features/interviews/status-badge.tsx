import { Badge } from "@/components/ui/badge";
import type { InterviewStatus } from "@/domain/scoring/types";

// The artifact's `.badge`/`.badge-*` pattern (plan Phase 14/§41): a colored
// dot + label, using the pass/borderline/fail/provisional/na CSS tokens that
// have existed in globals.css since Phase 8 but had no consumer until now —
// color is always paired with the text label itself, never used alone
// (plan §37 accessibility requirement).
export type BadgeTone = "pass" | "borderline" | "fail" | "provisional" | "na";

const TONE_CLASSES: Record<BadgeTone, string> = {
  pass: "border-pass-border bg-pass-bg text-pass",
  borderline: "border-borderline-border bg-borderline-bg text-borderline",
  fail: "border-fail-border bg-fail-bg text-fail",
  provisional: "border-provisional-border bg-provisional-bg text-provisional",
  na: "border-na-border bg-na-bg text-na",
};

/** The shared primitive — any status-like concept in the app (calculated
 * interview status, a Mandatory Requirement's met/not-met/unknown, etc.)
 * maps its own states onto these five tones rather than each inventing its
 * own color logic, so a "fail" always looks the same everywhere. */
export function ToneBadge({
  tone,
  label,
  className = "",
}: {
  tone: BadgeTone;
  label: string;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={`gap-1.5 font-semibold tracking-wide uppercase ${TONE_CLASSES[tone]} ${className}`}
    >
      <span className="size-1.5 shrink-0 rounded-full bg-current" />
      {label}
    </Badge>
  );
}

export const STATUS_TONE: Record<InterviewStatus, BadgeTone> = {
  PASS: "pass",
  BORDERLINE: "borderline",
  FAIL: "fail",
  PROVISIONAL: "provisional",
  NOT_EVALUATED: "na",
};

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: InterviewStatus;
  label: string;
  className?: string;
}) {
  return <ToneBadge tone={STATUS_TONE[status]} label={label} className={className} />;
}
