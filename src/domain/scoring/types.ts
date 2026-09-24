// Pure domain types for the scoring engine. Nothing in this module (or
// anywhere under src/domain/) imports from src/db or src/services — see
// docs/UNIVERSAL_INTERVIEW_PLATFORM_IMPLEMENTATION_PLAN.md §15/§26.

/** A rated question's score. `"na"` and `null` are deliberately distinct:
 * `null` means "not yet rated" (counts against completeness, never against
 * performance); `"na"` means "intentionally excluded" (counts against
 * neither). See plan §22 / artifact `recalc()`. */
export type ScoreValue = 0 | 1 | 2 | 3 | 4 | 5;
export type QuestionScore = ScoreValue | "na" | null;

export const SCORE_TO_PERCENT: Record<ScoreValue, number> = {
  0: 0,
  1: 20,
  2: 40,
  3: 60,
  4: 80,
  5: 100,
};

export interface Competency {
  id: string;
  weight: number;
  critical: boolean;
}

export interface QuestionEvaluationInput {
  competencyId: string;
  score: QuestionScore;
}

export type MandatoryRequirementStatus = "met" | "not_met" | "unknown";

export interface MandatoryRequirement {
  id: string;
}

export interface MandatoryRequirementEvaluationInput {
  requirementId: string;
  status: MandatoryRequirementStatus;
}

/** Generalizes the artifact's hardcoded English gate (plan §9, §17) to any
 * number of named supplementary assessments (English, a culture-fit check,
 * etc.), each with its own required/minLevel configuration. */
export interface SupplementaryGateConfig {
  id: string;
  required: boolean;
  minLevel: number;
}

export interface SupplementaryGateResult {
  id: string;
  level: number | null;
}

export interface ScoringConfiguration {
  passThreshold: number;
  borderlineMin: number;
  criticalMin: number;
  minCompletion: number;
}

export const DEFAULT_SCORING_CONFIG: ScoringConfiguration = {
  passThreshold: 70,
  borderlineMin: 50,
  criticalMin: 50,
  minCompletion: 70,
};

/**
 * Internal status enum. Deliberately kept at 1:1 parity with the artifact's
 * five calculated states (rather than collapsing NOT_EVALUATED/PROVISIONAL,
 * or inventing a KO/MEETS/EXCEEDS style scheme) because the artifact's
 * distinction between "zero evidence" and "some evidence but incomplete" is
 * meaningful UI information, not just an implementation detail. Phase 4's
 * per-stage vocabulary map relabels these five values for display — it does
 * not add or remove states.
 */
export type InterviewStatus =
  | "NOT_EVALUATED"
  | "PROVISIONAL"
  | "FAIL"
  | "BORDERLINE"
  | "PASS";

export type Recommendation = "PASS" | "FAIL" | "REVIEW_REQUIRED" | null;

export interface CompetencyStat {
  competencyId: string;
  evaluated: number;
  na: number;
  percent: number | null;
}

export interface CriticalCompetencyStatus {
  competencyId: string;
  percent: number | null;
  hasEvidence: boolean;
  meets: boolean;
}

export interface MandatoryRequirementStatusResult {
  requirementId: string;
  status: MandatoryRequirementStatus;
}

export interface CompletenessResult {
  totalApplicable: number;
  totalEvaluated: number;
  completion: number;
}

export interface CriticalRequirementResult {
  criticalCompetencyStatus: CriticalCompetencyStatus[];
  allCriticalHaveEvidence: boolean;
  anyCriticalFail: boolean;
  mandatoryRequirementStatus: MandatoryRequirementStatusResult[];
  allMandatoryRequirementsEvaluated: boolean;
  anyMandatoryRequirementFailed: boolean;
}

export interface ScoringResult {
  competencyStats: CompetencyStat[];
  overall: number | null;
  completion: number;
  totalApplicable: number;
  totalEvaluated: number;
  criticalCompetencyStatus: CriticalCompetencyStatus[];
  mandatoryRequirementStatus: MandatoryRequirementStatusResult[];
  status: InterviewStatus;
  reason: string;
  recommendation: Recommendation;
}

export interface CalculateScoringInput {
  competencies: Competency[];
  questionEvaluations: QuestionEvaluationInput[];
  mandatoryRequirements: MandatoryRequirement[];
  mandatoryRequirementEvaluations: MandatoryRequirementEvaluationInput[];
  supplementaryGates?: SupplementaryGateConfig[];
  supplementaryResults?: SupplementaryGateResult[];
  config: ScoringConfiguration;
}
