// Per-stage configuration — plan §8/§20: status vocabulary/labels and which
// supplementary modules are active are STAGE-SPECIFIC (configuration), while
// the underlying InterviewStatus enum computed by ScoringEngine stays fixed
// (Phase 2, untouched). Adding a new stage later (behavioral, leadership,
// hiring_manager, final — plan §8) means adding an entry here, not changing
// the engine.
import type { InterviewStatus, ScoreValue } from "@/domain/scoring/types";

export type InterviewStage = "technical" | "screening";

export const INTERVIEW_STAGES: readonly InterviewStage[] = [
  "technical",
  "screening",
];

export const STAGE_LABELS: Record<InterviewStage, string> = {
  technical: "Technical Interview",
  screening: "First Screening",
};

export interface StageModuleConfig {
  /** Whether coding exercises are AVAILABLE at all for this stage — a
   * ceiling, not a default (plan Phase 25/§45). Screening's `false` is an
   * absolute rule: a screening stage never codes with the candidate,
   * regardless of any per-template opt-in. Technical's `true` only means
   * the module CAN be used; whether it actually is comes from the
   * template's own `includeCodeExercises` column (opt-in, defaults off —
   * features/templates/ai-actions.ts ANDs the two together). */
  codeExercises: boolean;
  /** English (or another SupplementaryAssessment) is optional in both
   * stages — plan §9's generalization of the artifact's hardcoded English
   * gate — but only offered where it's a realistic tool to use. */
  supplementaryAssessments: boolean;
}

export const STAGE_MODULES: Record<InterviewStage, StageModuleConfig> = {
  technical: { codeExercises: true, supplementaryAssessments: true },
  screening: { codeExercises: false, supplementaryAssessments: true },
};

/** Relabels the fixed internal InterviewStatus enum (plan §20) for display —
 * it never adds, removes, or reinterprets a state. A Screening's "FAIL"
 * reads as "Not Advancing" rather than the Technical stage's "Fail" so the
 * UI vocabulary fits how each stage's outcome is actually talked about,
 * without touching ScoringEngine. */
export const STATUS_LABELS: Record<InterviewStage, Record<InterviewStatus, string>> = {
  technical: {
    NOT_EVALUATED: "Not Evaluated",
    PROVISIONAL: "Provisional",
    FAIL: "Fail",
    BORDERLINE: "Borderline",
    PASS: "Pass",
  },
  screening: {
    NOT_EVALUATED: "Not Evaluated",
    PROVISIONAL: "Provisional",
    FAIL: "Not Advancing",
    BORDERLINE: "Needs Review",
    PASS: "Advance",
  },
};

/** HR-friendly evidence-based rubric labels for First Screening, vs. a
 * generic depth-based label for Technical Interview (plan Phase 22/§43.8) —
 * presentation only, looked up from the same fixed 0-5 ScoreValue both
 * stages already use. Does NOT change ScoringEngine/SCORE_TO_PERCENT in any
 * way (ADR-006) — a screening "3" and a technical "3" are the identical
 * 60%, just described differently to match who's reading the label. */
export const RUBRIC_LABELS: Record<InterviewStage, Record<ScoreValue, string>> = {
  technical: {
    0: "No Understanding",
    1: "Weak",
    2: "Partial",
    3: "Meets Expected Level",
    4: "Strong",
    5: "Excellent",
  },
  screening: {
    0: "No Evidence / Does Not Meet",
    1: "Very Weak Evidence",
    2: "Limited Evidence",
    3: "Meets Screening Expectation",
    4: "Strong Evidence",
    5: "Excellent Evidence",
  },
};

export function rubricLabelFor(stage: InterviewStage, score: ScoreValue): string {
  return RUBRIC_LABELS[stage][score];
}

export function getStageConfig(stage: InterviewStage) {
  return {
    label: STAGE_LABELS[stage],
    modules: STAGE_MODULES[stage],
    statusLabels: STATUS_LABELS[stage],
    rubricLabels: RUBRIC_LABELS[stage],
  };
}

export function statusLabelFor(stage: InterviewStage, status: InterviewStatus): string {
  return STATUS_LABELS[stage][status];
}
