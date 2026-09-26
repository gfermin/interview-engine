import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
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
      archivedAt: interviewSessions.archivedAt,
      candidateId: candidates.id,
      candidateName: candidates.name,
      templateId: interviewTemplates.id,
      templateName: interviewTemplates.name,
      templateVersion: interviewTemplates.version,
      stage: interviewTemplates.stage,
      interviewLanguage: interviewTemplates.interviewLanguage,
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

export interface SessionListFilters {
  positionId?: string;
  candidateId?: string;
  stage?: "technical" | "screening";
  status?: "in_progress" | "completed" | "decided";
  /** Plan Phase 23/§44.9 — defaults to "active" so archived sessions never
   * clutter the global Interview History list or Dashboard. */
  archived?: "active" | "archived" | "all";
}

/** The interview history list (plan §11/Phase 11) — every session across
 * every candidate, filterable by position/candidate/stage/status. Filters
 * left `undefined` are simply omitted from the `WHERE` clause rather than
 * matched against, so an empty filter set returns every active session. */
export function listSessions(filters: SessionListFilters = {}) {
  const archived = filters.archived ?? "active";
  const conditions = [
    filters.positionId ? eq(positions.id, filters.positionId) : undefined,
    filters.candidateId ? eq(candidates.id, filters.candidateId) : undefined,
    filters.stage ? eq(interviewTemplates.stage, filters.stage) : undefined,
    filters.status ? eq(interviewSessions.status, filters.status) : undefined,
    archived === "all"
      ? undefined
      : archived === "archived"
        ? isNotNull(interviewSessions.archivedAt)
        : isNull(interviewSessions.archivedAt),
  ].filter((c) => c !== undefined);

  return db
    .select({
      id: interviewSessions.id,
      status: interviewSessions.status,
      createdAt: interviewSessions.createdAt,
      reopenCount: interviewSessions.reopenCount,
      archivedAt: interviewSessions.archivedAt,
      candidateId: candidates.id,
      candidateName: candidates.name,
      positionId: positions.id,
      positionTitle: positions.title,
      stage: interviewTemplates.stage,
      templateId: interviewTemplates.id,
      templateName: interviewTemplates.name,
      templateVersion: interviewTemplates.version,
    })
    .from(interviewSessions)
    .innerJoin(candidates, eq(interviewSessions.candidateId, candidates.id))
    .innerJoin(interviewTemplates, eq(interviewSessions.templateId, interviewTemplates.id))
    .innerJoin(positions, eq(interviewTemplates.positionId, positions.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(interviewSessions.createdAt));
}
