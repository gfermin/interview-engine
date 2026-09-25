// Pure human-decision state machine (plan §21) — ports the artifact's
// three-path model (accept / override / forced call) exactly. Nothing here
// touches persistence or the calculated result itself; it only answers
// "given this calculated InterviewStatus, what decisions are legal, and
// what does each one resolve to?"
import type { InterviewStatus } from "@/domain/scoring/types";

export type DecisionMode = "accept" | "override" | "forced_call";
export type FinalDecision = "PASS" | "FAIL";

/**
 * A decision can only be recorded once the calculated status is one of the
 * three "judged" states. `NOT_EVALUATED`/`PROVISIONAL` mean the interview
 * itself isn't ready to be judged yet — recording a decision against those
 * would let a human paper over missing evidence, which is exactly what the
 * completeness/critical-evidence gates (plan §20) exist to prevent.
 */
export function canRecordDecision(status: InterviewStatus): boolean {
  return status === "PASS" || status === "FAIL" || status === "BORDERLINE";
}

/**
 * `BORDERLINE` is the artifact's "ambiguous middle" — there is no calculated
 * PASS/FAIL to accept or override, so the interviewer must make an explicit
 * forced call instead (plan §21's "must explicitly choose PASS/FAIL with a
 * required reason"). Never silently resolved as a FAIL (plan's own quality
 * checklist: "do NOT silently convert BORDERLINE into FAIL").
 */
export function requiresForcedCall(status: InterviewStatus): boolean {
  return status === "BORDERLINE";
}

export function isValidDecisionMode(status: InterviewStatus, mode: DecisionMode): boolean {
  if (!canRecordDecision(status)) return false;
  return requiresForcedCall(status) ? mode === "forced_call" : mode !== "forced_call";
}

/**
 * Plain-language explanation of why a given (status, mode) pair is invalid
 * (§40.2) — the previous message (`A "${mode}" decision isn't valid for a
 * calculated status of "${status}".`) read like a stack trace, not something
 * a hiring-team interviewer should see verbatim. Only meaningful to call
 * when {@link isValidDecisionMode} has already returned `false`. `mode`
 * isn't read in the body — `status` alone determines which of the two
 * invalid shapes applies (only 3 modes exist, and {@link isValidDecisionMode}
 * already narrows which one was invalid) — but it's kept in the signature to
 * mirror {@link isValidDecisionMode}'s shape at call sites.
 */
export function describeInvalidDecisionMode(status: InterviewStatus, _mode: DecisionMode): string {
  if (!canRecordDecision(status)) {
    return "This interview hasn't reached a status that can be decided yet.";
  }
  if (requiresForcedCall(status)) {
    return "This result needs a forced Pass/Fail call.";
  }
  return "This result already has a calculated outcome — accept it or override it rather than forcing a call.";
}

/** Both `override` and `forced_call` require a reason (plan §21); a plain
 * `accept` doesn't — the interviewer agrees with a result that already has
 * its own calculated reason (`ScoringResult.reason`). */
export function requiresReason(mode: DecisionMode): boolean {
  return mode === "override" || mode === "forced_call";
}

/**
 * Resolves a decision mode into the final PASS/FAIL that gets stored
 * alongside (never in place of) the calculated result. Throws on a mode
 * that {@link isValidDecisionMode} would have rejected — callers are
 * expected to validate first, this is the "trusted internal invariant"
 * half, not a second layer of user-facing validation.
 */
export function resolveFinalDecision(
  status: InterviewStatus,
  mode: DecisionMode,
  forcedChoice?: FinalDecision
): FinalDecision {
  if (!isValidDecisionMode(status, mode)) {
    throw new Error(describeInvalidDecisionMode(status, mode));
  }

  if (mode === "forced_call") {
    if (!forcedChoice) throw new Error("A forced call requires an explicit PASS/FAIL choice.");
    return forcedChoice;
  }

  // status is guaranteed PASS or FAIL here (BORDERLINE only ever pairs with
  // forced_call, per isValidDecisionMode).
  const calculated = status as FinalDecision;
  if (mode === "accept") return calculated;
  // override
  return calculated === "PASS" ? "FAIL" : "PASS";
}
