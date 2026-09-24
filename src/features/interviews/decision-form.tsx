"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  isValidDecisionMode,
  requiresForcedCall,
  requiresReason,
  type DecisionMode,
  type FinalDecision,
} from "@/domain/interviews/decision";
import { statusLabelFor, type InterviewStage } from "@/domain/interviews/stage-config";
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
  stage: InterviewStage;
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
export function DecisionForm({ action, status, stage, existingDecision }: DecisionFormProps) {
  const [state, formAction, pending] = useActionState<
    FormActionState | undefined,
    FormData
  >(action, undefined);

  const forced = requiresForcedCall(status);
  // `existingDecision?.mode` is only a valid initial value if it's still
  // legal for the *current* status (§40.1) — a Reopen + re-rate can move the
  // calculated status (e.g. PASS -> BORDERLINE) without this component
  // unmounting, which would otherwise leave `mode: "accept"` selected for a
  // status that only accepts a forced call. The parent also keys this
  // component by `status` (see summary/page.tsx) so a status change forces a
  // clean remount; this check is the belt to that braces for any path that
  // reaches the same component instance regardless.
  const initialMode =
    existingDecision && isValidDecisionMode(status, existingDecision.mode)
      ? existingDecision.mode
      : forced
        ? "forced_call"
        : "accept";
  const [mode, setMode] = useState<DecisionMode>(initialMode);
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
            Force {statusLabelFor(stage, "PASS")}
          </Button>
          <Button
            type="button"
            variant={forcedChoice === "FAIL" ? "default" : "outline"}
            onClick={() => setForcedChoice("FAIL")}
          >
            Force {statusLabelFor(stage, "FAIL")}
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
