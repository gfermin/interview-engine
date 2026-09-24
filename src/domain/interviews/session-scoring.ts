// Composes the Phase 2 scoring engines for a live interview session (Phase
// 8). Still pure — plain data in, plain data out — it just saves every
// caller from re-deriving the same three-engine pipeline. MandatoryRequirement
// evaluation isn't wired into the live rating screen yet (that's Phase 9's
// Summary/Decision screen), so it's passed through as empty here; the
// resulting `criticalCompetencyStatus` is unaffected by that omission.
import {
  calculateCompetencyStats,
  calculateCompleteness,
  calculateCriticalRequirements,
  calculateOverall,
} from "@/domain/scoring";
import type {
  Competency,
  CompetencyStat,
  CriticalCompetencyStatus,
  QuestionEvaluationInput,
} from "@/domain/scoring/types";

export interface SessionScoring {
  competencyStats: Map<string, CompetencyStat>;
  overall: number | null;
  completion: number;
  totalApplicable: number;
  totalEvaluated: number;
  criticalCompetencyStatus: CriticalCompetencyStatus[];
}

export function computeSessionScoring(
  competencies: Competency[],
  evaluationInputs: QuestionEvaluationInput[],
  criticalMin: number
): SessionScoring {
  const competencyStats = calculateCompetencyStats(competencies, evaluationInputs);
  const overall = calculateOverall(competencies, competencyStats);
  const { completion, totalApplicable, totalEvaluated } =
    calculateCompleteness(evaluationInputs);
  const { criticalCompetencyStatus } = calculateCriticalRequirements(
    competencies,
    competencyStats,
    criticalMin,
    [],
    []
  );

  return {
    competencyStats,
    overall,
    completion,
    totalApplicable,
    totalEvaluated,
    criticalCompetencyStatus,
  };
}
