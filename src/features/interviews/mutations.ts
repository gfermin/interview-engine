import { db } from "@/db";
import { competencyEvaluations, questionEvaluations } from "@/db/schema";
import { calculateCompetencyStats } from "@/domain/scoring";
import type { QuestionScore } from "@/domain/scoring/types";
import { getQuestion, listCompetencies } from "@/features/templates/queries";
import { buildSessionEvaluationState } from "./queries";

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
  const question = await getQuestion(questionId);
  if (!question) throw new Error("Question not found.");

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
  await db
    .insert(questionEvaluations)
    .values({ sessionId, questionId, score: null, isNa: false, notes })
    .onConflictDoUpdate({
      target: [questionEvaluations.sessionId, questionEvaluations.questionId],
      set: { notes, updatedAt: new Date() },
    });
}
