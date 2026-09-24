import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  competencyEvaluations,
  interviewDecisions,
  interviewSessions,
  mandatoryRequirementEvaluations,
  questionEvaluations,
  supplementaryAssessments,
} from "@/db/schema";
import { calculateCompetencyStats } from "@/domain/scoring";
import {
  describeInvalidDecisionMode,
  isValidDecisionMode,
  requiresReason,
  resolveFinalDecision,
  type DecisionMode,
  type FinalDecision,
} from "@/domain/interviews/decision";
import { canReopenSession, isSessionDecided, isSessionEditable } from "@/domain/interviews/session-lifecycle";
import type { MandatoryRequirementStatus, QuestionScore } from "@/domain/scoring/types";
import { getMandatoryRequirement, getQuestion, listCompetencies } from "@/features/templates/queries";
import { buildSessionEvaluationState, getSession } from "./queries";
import { computeFullScoringResult } from "./scoring";

class SessionNotEditableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SessionNotEditableError";
  }
}

/** Guards question ratings/notes — the "conducting the interview" phase
 * ends the moment `finishRating` moves a session past `in_progress`, and
 * only Reopen can bring it back (plan §16/Phase 11). */
async function requireEditableSession(sessionId: string) {
  const session = await getSession(sessionId);
  if (!session) throw new Error("Session not found.");
  if (!isSessionEditable(session)) {
    throw new SessionNotEditableError(
      "This interview has already been finished — reopen it before changing ratings."
    );
  }
  return session;
}

/** Guards the Summary screen's own inputs (Mandatory Requirement status,
 * the English level) — unlike question ratings, these stay editable while
 * `completed` (that's the whole point of visiting Summary before a decision
 * exists: to finish evaluating the gates a decision depends on). Only
 * `decided` freezes them, matching {@link isSessionDecided}. */
async function requireNotDecided(sessionId: string) {
  const session = await getSession(sessionId);
  if (!session) throw new Error("Session not found.");
  if (isSessionDecided(session)) {
    throw new SessionNotEditableError(
      "This interview has already been decided — reopen it before changing this."
    );
  }
  return session;
}

/**
 * Recomputes and persists the `competencyEvaluations` cache (plan §16: "cached
 * rollup ... recomputed on every rating change") after a question's score
 * changes. Notes-only edits don't call this — they can't affect scoring.
 */
async function persistCompetencyEvaluations(sessionId: string, templateId: string) {
  const [competencies, { evaluationInputs }] = await Promise.all([
    listCompetencies(templateId),
    buildSessionEvaluationState(templateId, sessionId),
  ]);
  const stats = calculateCompetencyStats(competencies, evaluationInputs);

  for (const competency of competencies) {
    const stat = stats.get(competency.id)!;
    await db
      .insert(competencyEvaluations)
      .values({
        sessionId,
        competencyId: competency.id,
        evaluated: stat.evaluated,
        na: stat.na,
        percent: stat.percent,
      })
      .onConflictDoUpdate({
        target: [competencyEvaluations.sessionId, competencyEvaluations.competencyId],
        set: { evaluated: stat.evaluated, na: stat.na, percent: stat.percent, updatedAt: new Date() },
      });
  }
}

/**
 * Rates (or clears) one question in a session — `value` is a 0-5 score,
 * `"na"`, or `null` to reset back to unrated. Matches the artifact's
 * `recalc()`-on-every-interaction pattern: the competency rollup cache is
 * recomputed synchronously in the same call, not on a delayed/batched pass.
 */
export async function rateQuestion(
  sessionId: string,
  questionId: string,
  value: QuestionScore
) {
  const session = await requireEditableSession(sessionId);
  const question = await getQuestion(questionId);
  if (!question) throw new Error("Question not found.");
  // Defensive cross-template guard (§40.4) — reachable only through
  // Next.js's encrypted bound-server-action closures, not raw client-
  // controlled FormData, but a mismatch should still be rejected rather
  // than silently rating a question that isn't even part of this session's
  // template.
  if (question.templateId !== session.templateId) {
    throw new Error("This question doesn't belong to this session's template.");
  }

  const score = typeof value === "number" ? value : null;
  const isNa = value === "na";

  await db
    .insert(questionEvaluations)
    .values({ sessionId, questionId, score, isNa })
    .onConflictDoUpdate({
      target: [questionEvaluations.sessionId, questionEvaluations.questionId],
      set: { score, isNa, updatedAt: new Date() },
    });

  await persistCompetencyEvaluations(sessionId, question.templateId);
}

/**
 * Updates a question's free-text notes without touching its score/N-A state
 * — the `onConflictDoUpdate` only sets `notes`, so an existing rating is
 * left exactly as it was (the `values()` defaults only apply when no row
 * exists yet, i.e. notes were added before any rating).
 */
export async function updateQuestionNotes(
  sessionId: string,
  questionId: string,
  notes: string | null
) {
  await requireEditableSession(sessionId);
  await db
    .insert(questionEvaluations)
    .values({ sessionId, questionId, score: null, isNa: false, notes })
    .onConflictDoUpdate({
      target: [questionEvaluations.sessionId, questionEvaluations.questionId],
      set: { notes, updatedAt: new Date() },
    });
}

/** Sets (or clears, via `"unknown"`) one MandatoryRequirement's status for a
 * session — a boolean-ish knockout gate independent of competency scoring
 * (plan §4.3/§19), not a rated question, so it has its own small mutation
 * rather than going through {@link rateQuestion}. */
export async function updateMandatoryRequirementStatus(
  sessionId: string,
  requirementId: string,
  status: MandatoryRequirementStatus
) {
  const session = await requireNotDecided(sessionId);
  const requirement = await getMandatoryRequirement(requirementId);
  if (!requirement || requirement.templateId !== session.templateId) {
    throw new Error("This requirement doesn't belong to this session's template.");
  }
  await db
    .insert(mandatoryRequirementEvaluations)
    .values({ sessionId, requirementId, status })
    .onConflictDoUpdate({
      target: [mandatoryRequirementEvaluations.sessionId, mandatoryRequirementEvaluations.requirementId],
      set: { status, updatedAt: new Date() },
    });
}

/** Records the candidate's English level (1-5, or `null` to clear it back
 * to "not assessed") — the artifact's hardcoded English module, generalized
 * to the `supplementaryAssessments` table (plan §9) but only "english" is
 * wired up yet. */
export async function updateEnglishAssessment(sessionId: string, level: number | null) {
  await requireNotDecided(sessionId);
  await db
    .insert(supplementaryAssessments)
    .values({ sessionId, kind: "english", level })
    .onConflictDoUpdate({
      target: [supplementaryAssessments.sessionId, supplementaryAssessments.kind],
      set: { level, updatedAt: new Date() },
    });
}

/**
 * Moves a session from `in_progress` to `completed` (plan §16's documented
 * lifecycle: in_progress -> completed -> decided -> reopened) — the
 * interviewer is done rating and moving on to the Summary screen. Idempotent:
 * calling it again on an already-`completed`/`decided` session is a no-op,
 * so simply revisiting the Summary screen never resets anything.
 */
export async function finishRating(sessionId: string) {
  const session = await getSession(sessionId);
  if (!session) throw new Error("Session not found.");
  if (session.status !== "in_progress") return;

  await db
    .update(interviewSessions)
    .set({ status: "completed", updatedAt: new Date() })
    .where(eq(interviewSessions.id, sessionId));
}

export interface RecordDecisionInput {
  mode: DecisionMode;
  forcedChoice?: FinalDecision;
  reason?: string | null;
}

/**
 * Records the interviewer's decision against the *current* calculated
 * result (plan §21) — accept, override (reason required), or, on the
 * calculated BORDERLINE tier, an explicit forced PASS/FAIL call (reason
 * required). Recomputes the calculated result itself right before
 * validating, so a decision is always checked against fresh evidence, never
 * a stale value the caller happened to have on hand. Overwrites any prior
 * decision for this session with no history kept — a confirmed POC
 * limitation (plan §21/§38); a full audit trail is post-POC.
 */
export async function recordDecision(sessionId: string, input: RecordDecisionInput) {
  const session = await getSession(sessionId);
  if (!session) throw new Error("Session not found.");

  const result = await computeFullScoringResult(sessionId, session.templateId);

  if (!isValidDecisionMode(result.status, input.mode)) {
    throw new Error(describeInvalidDecisionMode(result.status, input.mode));
  }
  if (requiresReason(input.mode) && !input.reason?.trim()) {
    throw new Error("A reason is required for an override or a forced call.");
  }

  const finalDecision = resolveFinalDecision(result.status, input.mode, input.forcedChoice);

  await db
    .insert(interviewDecisions)
    .values({
      sessionId,
      calculatedStatus: result.status,
      calculatedReason: result.reason,
      calculatedRecommendation: result.recommendation,
      mode: input.mode,
      finalDecision,
      reason: input.reason?.trim() || null,
    })
    .onConflictDoUpdate({
      target: interviewDecisions.sessionId,
      set: {
        calculatedStatus: result.status,
        calculatedReason: result.reason,
        calculatedRecommendation: result.recommendation,
        mode: input.mode,
        finalDecision,
        reason: input.reason?.trim() || null,
        updatedAt: new Date(),
      },
    });

  await db
    .update(interviewSessions)
    .set({ status: "decided", updatedAt: new Date() })
    .where(eq(interviewSessions.id, sessionId));

  return { result, finalDecision };
}

/**
 * Reopens a `completed` or `decided` session back to `in_progress` (plan
 * §16/Phase 11) — the only path back to editable ratings once
 * `finishRating` or `recordDecision` has locked them. Deliberately doesn't
 * touch the existing `InterviewDecision` or delete anything: the prior
 * decision stays visible on the Summary screen (as history-of-one, per the
 * POC's no-audit-trail limitation, plan §21/§38) until the interviewer
 * records a new one, and a subsequent `generateReport` call produces a
 * *second* `InterviewReport` row rather than replacing the first (plan
 * §24's "regenerating a report ... produces a new version only through an
 * explicit reopen action").
 */
export async function reopenSession(sessionId: string) {
  const session = await getSession(sessionId);
  if (!session) throw new Error("Session not found.");
  if (!canReopenSession(session)) {
    throw new Error("Only a finished interview can be reopened.");
  }

  await db
    .update(interviewSessions)
    .set({
      status: "in_progress",
      reopenedAt: new Date(),
      reopenCount: session.reopenCount + 1,
      updatedAt: new Date(),
    })
    .where(eq(interviewSessions.id, sessionId));
}
