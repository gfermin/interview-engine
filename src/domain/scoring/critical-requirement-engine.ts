import type {
  Competency,
  CompetencyStat,
  CriticalRequirementResult,
  MandatoryRequirement,
  MandatoryRequirementEvaluationInput,
} from "./types";

/**
 * A high overall score must never hide a failed knockout condition (plan
 * §19/§20, artifact `recalc()`). Two independent knockout mechanisms are
 * evaluated here:
 *
 * - Critical competencies: a scored competency flagged `critical` must meet
 *   `criticalMin` once it has evidence. No evidence yet ≠ failing — it means
 *   the interview isn't ready to be judged (drives PROVISIONAL upstream).
 * - Mandatory requirements: boolean gates (e.g. work authorization, a
 *   required certification) that are not scored competencies at all. This
 *   is the mechanism the original master prompt specified but the shipped
 *   "Calibración QA" artifact never implemented (plan §4.3) — restored here.
 */
export function calculateCriticalRequirements(
  competencies: Competency[],
  competencyStats: Map<string, CompetencyStat>,
  criticalMin: number,
  mandatoryRequirements: MandatoryRequirement[],
  mandatoryRequirementEvaluations: MandatoryRequirementEvaluationInput[]
): CriticalRequirementResult {
  const criticalCompetencyStatus = competencies
    .filter((competency) => competency.critical)
    .map((competency) => {
      const stat = competencyStats.get(competency.id);
      const percent = stat?.percent ?? null;
      return {
        competencyId: competency.id,
        percent,
        hasEvidence: (stat?.evaluated ?? 0) > 0,
        meets: percent !== null && percent >= criticalMin,
      };
    });

  const allCriticalHaveEvidence = criticalCompetencyStatus.every(
    (c) => c.hasEvidence
  );
  const anyCriticalFail = criticalCompetencyStatus.some(
    (c) => c.hasEvidence && !c.meets
  );

  const statusByRequirementId = new Map(
    mandatoryRequirementEvaluations.map((e) => [e.requirementId, e.status])
  );
  const mandatoryRequirementStatus = mandatoryRequirements.map(
    (requirement) => ({
      requirementId: requirement.id,
      status: statusByRequirementId.get(requirement.id) ?? "unknown",
    })
  );

  const allMandatoryRequirementsEvaluated = mandatoryRequirementStatus.every(
    (r) => r.status !== "unknown"
  );
  const anyMandatoryRequirementFailed = mandatoryRequirementStatus.some(
    (r) => r.status === "not_met"
  );

  return {
    criticalCompetencyStatus,
    allCriticalHaveEvidence,
    anyCriticalFail,
    mandatoryRequirementStatus,
    allMandatoryRequirementsEvaluated,
    anyMandatoryRequirementFailed,
  };
}
