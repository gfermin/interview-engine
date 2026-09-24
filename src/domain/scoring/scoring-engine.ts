import { calculateCompleteness } from "./completeness-engine";
import { calculateCriticalRequirements } from "./critical-requirement-engine";
import {
  SCORE_TO_PERCENT,
  type CalculateScoringInput,
  type Competency,
  type CompetencyStat,
  type InterviewStatus,
  type QuestionEvaluationInput,
  type Recommendation,
  type ScoringResult,
} from "./types";

/** Per-competency percent = average PCT over that competency's *evaluated*
 * (rated, non-N/A) questions. N/A counts against neither numerator nor
 * denominator; unrated questions aren't counted at all here (they only
 * affect completeness, via {@link calculateCompleteness}). */
export function calculateCompetencyStats(
  competencies: Competency[],
  evaluations: QuestionEvaluationInput[]
): Map<string, CompetencyStat> {
  const stats = new Map<string, CompetencyStat>();
  const sums = new Map<string, number>();
  for (const competency of competencies) {
    stats.set(competency.id, {
      competencyId: competency.id,
      evaluated: 0,
      na: 0,
      percent: null,
    });
    sums.set(competency.id, 0);
  }

  for (const evaluation of evaluations) {
    const stat = stats.get(evaluation.competencyId);
    // A question mapped to a competency outside this template/session is
    // silently ignored, mirroring the artifact's `if(!c) return;` guard.
    if (!stat) continue;

    if (evaluation.score === "na") {
      stat.na++;
      continue;
    }
    if (typeof evaluation.score === "number") {
      stat.evaluated++;
      sums.set(
        evaluation.competencyId,
        (sums.get(evaluation.competencyId) ?? 0) +
          SCORE_TO_PERCENT[evaluation.score]
      );
    }
  }

  for (const competency of competencies) {
    const stat = stats.get(competency.id)!;
    stat.percent =
      stat.evaluated > 0 ? (sums.get(competency.id) ?? 0) / stat.evaluated : null;
  }

  return stats;
}

/** Overall = weighted average over only the competencies that currently
 * have evidence, with weights renormalized to just those competencies — an
 * incomplete interview isn't dragged down by not-yet-evaluated competencies
 * (the completeness gate, not this average, is what prevents that from
 * being gamed). */
export function calculateOverall(
  competencies: Competency[],
  stats: Map<string, CompetencyStat>
): number | null {
  let weightedSum = 0;
  let weightTotal = 0;
  for (const competency of competencies) {
    const percent = stats.get(competency.id)?.percent ?? null;
    if (percent !== null) {
      weightedSum += percent * competency.weight;
      weightTotal += competency.weight;
    }
  }
  return weightTotal > 0 ? weightedSum / weightTotal : null;
}

/**
 * Deterministic scoring/status calculation. Never touches AI, persistence,
 * or presentation — see docs/UNIVERSAL_INTERVIEW_PLATFORM_IMPLEMENTATION_PLAN.md
 * ADR-006 ("AI never decides PASS/FAIL"). This reproduces the artifact's
 * `recalc()` precedence order exactly, generalized with an independent
 * MandatoryRequirement knockout (§4.3/§19) alongside the critical-competency
 * knockout, and an N-gate SupplementaryAssessment check (§9/§17) generalizing
 * the artifact's hardcoded English gate.
 *
 * Status precedence (first match wins):
 *  1. No evidence at all                                   -> NOT_EVALUATED
 *  2. Incomplete, or a critical competency / mandatory      -> PROVISIONAL
 *     requirement has no evidence yet
 *  3. A critical competency or mandatory requirement        -> FAIL
 *     that HAS evidence fails its bar (knockout)
 *  4. Overall score below the minimum passing range         -> FAIL
 *  5. Overall score at/above the pass threshold, but a       -> BORDERLINE
 *     required supplementary gate isn't met
 *  6. Overall score at/above the pass threshold, all gates   -> PASS
 *     met
 *  7. Otherwise (the borderline band)                        -> BORDERLINE
 */
export function calculate(input: CalculateScoringInput): ScoringResult {
  const {
    competencies,
    questionEvaluations,
    mandatoryRequirements,
    mandatoryRequirementEvaluations,
    config,
  } = input;
  const supplementaryGates = input.supplementaryGates ?? [];
  const supplementaryResults = input.supplementaryResults ?? [];

  const competencyStatsMap = calculateCompetencyStats(
    competencies,
    questionEvaluations
  );
  const overall = calculateOverall(competencies, competencyStatsMap);
  const { completion, totalApplicable, totalEvaluated } =
    calculateCompleteness(questionEvaluations);
  const {
    criticalCompetencyStatus,
    allCriticalHaveEvidence,
    anyCriticalFail,
    mandatoryRequirementStatus,
    allMandatoryRequirementsEvaluated,
    anyMandatoryRequirementFailed,
  } = calculateCriticalRequirements(
    competencies,
    competencyStatsMap,
    config.criticalMin,
    mandatoryRequirements,
    mandatoryRequirementEvaluations
  );

  const hasAnyEvidence =
    overall !== null ||
    mandatoryRequirementStatus.some((r) => r.status !== "unknown");

  let status: InterviewStatus;
  let reason: string;

  if (!hasAnyEvidence) {
    status = "NOT_EVALUATED";
    reason =
      "No competency or mandatory-requirement evidence has been recorded yet.";
  } else if (
    completion < config.minCompletion ||
    !allCriticalHaveEvidence ||
    !allMandatoryRequirementsEvaluated
  ) {
    status = "PROVISIONAL";
    if (completion < config.minCompletion) {
      reason = `Interview completion (${completion.toFixed(0)}%) is below the required minimum (${config.minCompletion}%).`;
    } else if (!allCriticalHaveEvidence) {
      reason = "At least one critical competency has no evidence yet.";
    } else {
      reason = "At least one mandatory requirement has not been evaluated yet.";
    }
  } else if (anyCriticalFail || anyMandatoryRequirementFailed) {
    status = "FAIL";
    if (anyCriticalFail) {
      const failed = criticalCompetencyStatus
        .filter((c) => c.hasEvidence && !c.meets)
        .map((c) => c.competencyId);
      reason = `Critical competenc${failed.length === 1 ? "y" : "ies"} below the required minimum (${config.criticalMin}%): ${failed.join(", ")}. This overrides the overall score.`;
    } else {
      const failed = mandatoryRequirementStatus
        .filter((r) => r.status === "not_met")
        .map((r) => r.requirementId);
      reason = `Mandatory requirement(s) not demonstrated: ${failed.join(", ")}. This overrides the overall score.`;
    }
  } else if (overall === null) {
    // Unreachable given the completion gate above (completion >= minCompletion
    // > 0 implies at least one scored question was evaluated, so overall
    // cannot be null here). Kept as an explicit, tested guard rather than a
    // non-null assertion.
    status = "PROVISIONAL";
    reason = "No scored evidence recorded yet.";
  } else if (overall < config.borderlineMin) {
    status = "FAIL";
    reason = `Overall score (${overall.toFixed(0)}%) is below the minimum passing range (${config.borderlineMin}%).`;
  } else if (overall >= config.passThreshold) {
    const unmetGates = supplementaryGates.filter((gate) => {
      if (!gate.required) return false;
      const result = supplementaryResults.find((r) => r.id === gate.id);
      return !result || result.level === null || result.level < gate.minLevel;
    });
    if (unmetGates.length > 0) {
      status = "BORDERLINE";
      reason = `Overall score (${overall.toFixed(0)}%) meets the passing threshold, but required assessment(s) not met: ${unmetGates.map((g) => g.id).join(", ")}.`;
    } else {
      status = "PASS";
      reason = `Overall score (${overall.toFixed(0)}%) meets the passing threshold (${config.passThreshold}%), all critical competencies and mandatory requirements are satisfied.`;
    }
  } else {
    status = "BORDERLINE";
    reason = `Overall score (${overall.toFixed(0)}%) is in the borderline range (${config.borderlineMin}%-${config.passThreshold - 1}%).`;
  }

  const recommendation: Recommendation =
    status === "PASS"
      ? "PASS"
      : status === "FAIL"
        ? "FAIL"
        : status === "BORDERLINE"
          ? "REVIEW_REQUIRED"
          : null;

  return {
    competencyStats: [...competencyStatsMap.values()],
    overall,
    completion,
    totalApplicable,
    totalEvaluated,
    criticalCompetencyStatus,
    mandatoryRequirementStatus,
    status,
    reason,
    recommendation,
  };
}
