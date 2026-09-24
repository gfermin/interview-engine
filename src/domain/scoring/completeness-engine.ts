import type { CompletenessResult, QuestionEvaluationInput } from "./types";

/**
 * Interview completeness, tracked independently of performance (plan §32 /
 * artifact `recalc()`). A question marked "na" counts toward neither the
 * numerator nor the denominator. An unrated ("null") question counts toward
 * the denominator (it lowers completeness) but never the numerator — an
 * unanswered question is not a wrong answer.
 */
export function calculateCompleteness(
  evaluations: QuestionEvaluationInput[]
): CompletenessResult {
  let totalApplicable = 0;
  let totalEvaluated = 0;

  for (const evaluation of evaluations) {
    if (evaluation.score === "na") continue;
    totalApplicable++;
    if (typeof evaluation.score === "number") totalEvaluated++;
  }

  const completion =
    totalApplicable > 0 ? (totalEvaluated / totalApplicable) * 100 : 0;

  return { totalApplicable, totalEvaluated, completion };
}
