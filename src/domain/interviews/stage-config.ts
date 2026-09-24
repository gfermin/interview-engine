// Per-stage configuration — plan §8/§20: status vocabulary/labels and which
// supplementary modules are active are STAGE-SPECIFIC (configuration), while
// the underlying InterviewStatus enum computed by ScoringEngine stays fixed
// (Phase 2, untouched). Adding a new stage later (behavioral, leadership,
// hiring_manager, final — plan §8) means adding an entry here, not changing
// the engine.
import type { InterviewStatus } from "@/domain/scoring/types";

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
  /** Code-exercise questions are meaningful for a hands-on technical
   * interview; a screening stage doesn't code with the candidate. */
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

export function getStageConfig(stage: InterviewStage) {
  return {
    label: STAGE_LABELS[stage],
    modules: STAGE_MODULES[stage],
    statusLabels: STATUS_LABELS[stage],
  };
}

export function statusLabelFor(stage: InterviewStage, status: InterviewStatus): string {
  return STATUS_LABELS[stage][status];
}
