import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  candidates,
  interviewDecisions,
  interviewSessions,
  interviewTemplates,
  mandatoryRequirementEvaluations,
  positions,
  questionEvaluations,
  supplementaryAssessments,
} from "@/db/schema";
import type { QuestionEvaluationInput, QuestionScore } from "@/domain/scoring/types";
import { listQuestions } from "@/features/templates/queries";

/** Minimal session row for guards/mutations that don't need the full join
 * ({@link getSessionDetail} does, for the page header). */
export function getSession(sessionId: string) {
  return db.query.interviewSessions.findFirst({ where: eq(interviewSessions.id, sessionId) });
}

/** Everything the live interview screen's header needs about a session,
 * joined in one query (session -> candidate, session -> template -> position). */
export async function getSessionDetail(sessionId: string) {
  const [row] = await db
    .select({
      id: interviewSessions.id,
      status: interviewSessions.status,
      candidateId: candidates.id,
      candidateName: candidates.name,
      templateId: interviewTemplates.id,
      templateName: interviewTemplates.name,
      templateVersion: interviewTemplates.version,
      stage: interviewTemplates.stage,
      passThreshold: interviewTemplates.passThreshold,
      borderlineMin: interviewTemplates.borderlineMin,
      criticalMin: interviewTemplates.criticalMin,
      minCompletion: interviewTemplates.minCompletion,
      positionId: positions.id,
      positionTitle: positions.title,
    })
    .from(interviewSessions)
    .innerJoin(candidates, eq(interviewSessions.candidateId, candidates.id))
    .innerJoin(interviewTemplates, eq(interviewSessions.templateId, interviewTemplates.id))
    .innerJoin(positions, eq(interviewTemplates.positionId, positions.id))
    .where(eq(interviewSessions.id, sessionId))
    .limit(1);
  return row;
}

/** Raw per-question evaluation rows that exist so far — a question with no
 * row yet is simply unrated (plan §22: unanswered ≠ score 0), so callers
 * building a full evaluation set must still iterate every Question in the
 * template, not just these rows. */
export function listQuestionEvaluations(sessionId: string) {
  return db.query.questionEvaluations.findMany({
    where: eq(questionEvaluations.sessionId, sessionId),
  });
}

function toQuestionScore(row: { score: number | null; isNa: boolean } | undefined): QuestionScore {
  if (!row) return null;
  return row.isNa ? "na" : (row.score as QuestionScore | null);
}

/**
 * Every Question in the template paired with its current evaluation state —
 * shared by the live interview page (rendering each QuestionCard's current
 * value) and the scoring recompute in mutations.ts, so the "unrated
 * questions still count toward the denominator" mapping lives in one place.
 */
export async function buildSessionEvaluationState(templateId: string, sessionId: string) {
  const [questions, evaluationRows] = await Promise.all([
    listQuestions(templateId),
    listQuestionEvaluations(sessionId),
  ]);
  const evaluationByQuestionId = new Map(evaluationRows.map((row) => [row.questionId, row]));

  const evaluationInputs: QuestionEvaluationInput[] = questions.map((question) => ({
    competencyId: question.competencyId,
    score: toQuestionScore(evaluationByQuestionId.get(question.id)),
  }));

  return { questions, evaluationByQuestionId, evaluationInputs };
}

/** Raw per-requirement status rows that exist so far — like question
 * evaluations, a requirement with no row yet is "unknown," not omitted; see
 * {@link buildMandatoryRequirementInputs}. */
export function listMandatoryRequirementEvaluations(sessionId: string) {
  return db.query.mandatoryRequirementEvaluations.findMany({
    where: eq(mandatoryRequirementEvaluations.sessionId, sessionId),
  });
}

export function getSupplementaryAssessment(sessionId: string, kind: "english") {
  return db.query.supplementaryAssessments.findFirst({
    where: and(eq(supplementaryAssessments.sessionId, sessionId), eq(supplementaryAssessments.kind, kind)),
  });
}

export function getDecision(sessionId: string) {
  return db.query.interviewDecisions.findFirst({
    where: eq(interviewDecisions.sessionId, sessionId),
  });
}
