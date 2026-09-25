import { Button, type buttonVariants } from "@/components/ui/button";
import type { MandatoryRequirementStatus } from "@/domain/scoring/types";
import { t, type Locale } from "@/lib/i18n";
import { updateMandatoryRequirementStatusAction } from "./actions";

type ButtonVariant = NonNullable<Parameters<typeof buttonVariants>[0]>["variant"];

// Met/Not Met carry the same fixed pass/fail color regardless of which is
// currently selected (matching the artifact's decision buttons — see
// decision-form.tsx's own note on this), not a single toggle color; only
// the *selected* option gets a solid fill, the rest stay outline.
const VARIANT_WHEN_SELECTED: Record<MandatoryRequirementStatus, ButtonVariant> = {
  met: "default",
  not_met: "destructive",
  unknown: "secondary",
};

const OPTIONS: { status: MandatoryRequirementStatus; labelKey: string }[] = [
  { status: "met", labelKey: "interview.mandatoryStatusMet" },
  { status: "not_met", labelKey: "interview.mandatoryStatusNotMet" },
  { status: "unknown", labelKey: "interview.mandatoryStatusUnknown" },
];

/**
 * A MandatoryRequirement is a boolean-ish knockout gate, not a scored
 * competency (plan §4.3/§19) — the artifact never built this control at
 * all, folding everything into competency scoring instead. Same
 * plain-form-per-option pattern as RateBar, so no client JS is required.
 */
export function MandatoryRequirementControl({
  sessionId,
  requirementId,
  currentStatus,
  locale = "en",
}: {
  sessionId: string;
  requirementId: string;
  currentStatus: MandatoryRequirementStatus;
  locale?: Locale;
}) {
  return (
    <div className="flex gap-1">
      {OPTIONS.map(({ status, labelKey }) => (
        <form
          key={status}
          action={updateMandatoryRequirementStatusAction.bind(null, sessionId, requirementId, status)}
        >
          <Button
            type="submit"
            size="sm"
            variant={currentStatus === status ? VARIANT_WHEN_SELECTED[status] : "outline"}
          >
            {t(locale, labelKey)}
          </Button>
        </form>
      ))}
    </div>
  );
}
