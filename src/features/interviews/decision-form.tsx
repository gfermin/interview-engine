"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requiresForcedCall, requiresReason, type DecisionMode, type FinalDecision } from "@/domain/interviews/decision";
import type { InterviewStatus } from "@/domain/scoring/types";
import type { FormActionState } from "./actions";

interface ExistingDecision {
  mode: DecisionMode;
  finalDecision: FinalDecision;
  reason: string | null;
}

interface DecisionFormProps {
  action: (
    prevState: FormActionState | undefined,
    formData: FormData
  ) => Promise<FormActionState | undefined>;
  status: InterviewStatus;
  existingDecision?: ExistingDecision | null;
}

/**
 * The artifact's three-path decision model (plan §21): accept the
 * calculated result, override it (reason required), or — when the
 * calculated status is the "ambiguous middle" (BORDERLINE) — force an
 * explicit PASS/FAIL call (reason required). Which pair of options is even
 * offered is fixed by `status`, not left to the interviewer to pick wrong:
 * BORDERLINE only ever offers a forced call, PASS/FAIL only ever offer
 * accept/override.
 */
export function DecisionForm({ action, status, existingDecision }: DecisionFormProps) {
  const [state, formAction, pending] = useActionState<
    FormActionState | undefined,
    FormData
  >(action, undefined);

  const forced = requiresForcedCall(status);
  const [mode, setMode] = useState<DecisionMode>(existingDecision?.mode ?? (forced ? "forced_call" : "accept"));
  const [forcedChoice, setForcedChoice] = useState<FinalDecision>(
    existingDecision?.finalDecision ?? "PASS"
  );

  const needsReason = requiresReason(mode);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      {state?.error ? (
        <p className="text-sm font-medium text-destructive">{state.error}</p>
      ) : null}

      <input type="hidden" name="mode" value={mode} />
      {forced ? <input type="hidden" name="forcedChoice" value={forcedChoice} /> : null}

      {forced ? (
        <div className="flex gap-2">
          <Button
            type="button"
            variant={forcedChoice === "PASS" ? "default" : "outline"}
            onClick={() => setForcedChoice("PASS")}
          >
            Force PASS
          </Button>
          <Button
            type="button"
            variant={forcedChoice === "FAIL" ? "default" : "outline"}
            onClick={() => setForcedChoice("FAIL")}
          >
            Force FAIL
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button
            type="button"
            variant={mode === "accept" ? "default" : "outline"}
            onClick={() => setMode("accept")}
          >
            Accept
          </Button>
          <Button
            type="button"
            variant={mode === "override" ? "default" : "outline"}
            onClick={() => setMode("override")}
          >
            Override
          </Button>
        </div>
      )}

      {needsReason ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reason">Reason (required)</Label>
          <Textarea
            id="reason"
            name="reason"
            rows={3}
            required
            defaultValue={existingDecision?.reason ?? ""}
          />
          {state?.fieldErrors?.reason ? (
            <p className="text-xs text-destructive">{state.fieldErrors.reason[0]}</p>
          ) : null}
        </div>
      ) : null}

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Saving..." : existingDecision ? "Change Decision" : "Record Decision"}
      </Button>
    </form>
  );
}
