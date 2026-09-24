import { Button } from "@/components/ui/button";
import type { MandatoryRequirementStatus } from "@/domain/scoring/types";
import { updateMandatoryRequirementStatusAction } from "./actions";

const OPTIONS: { status: MandatoryRequirementStatus; label: string }[] = [
  { status: "met", label: "Met" },
  { status: "not_met", label: "Not Met" },
  { status: "unknown", label: "Unknown" },
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
}: {
  sessionId: string;
  requirementId: string;
  currentStatus: MandatoryRequirementStatus;
}) {
  return (
    <div className="flex gap-1">
      {OPTIONS.map(({ status, label }) => (
        <form
          key={status}
          action={updateMandatoryRequirementStatusAction.bind(null, sessionId, requirementId, status)}
        >
          <Button
            type="submit"
            size="sm"
            variant={currentStatus === status ? "default" : "outline"}
          >
            {label}
          </Button>
        </form>
      ))}
    </div>
  );
}
