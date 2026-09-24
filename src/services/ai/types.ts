import type { InterviewStage } from "@/domain/interviews/stage-config";
import type { JobAnalysisResult, TemplateDraft } from "./schemas";

export interface AnalyzeJobDescriptionInput {
  positionTitle: string;
  roleFamily: string | null;
  seniority: string | null;
  stage: InterviewStage;
  jobDescriptionText: string;
}

export interface GenerateTemplateDraftInput {
  positionTitle: string;
  roleFamily: string | null;
  seniority: string | null;
  stage: InterviewStage;
  jobDescriptionText: string;
  jobAnalysis: JobAnalysisResult;
  /** Whether to ask for code-exercise questions at all — plan §8/§20:
   * Screening doesn't code with the candidate, Technical does. */
  includeCodeExercises: boolean;
}

/**
 * The three AI-assisted touch points (plan §17) behind one interface, so a
 * second provider (OpenAI, a local model) is a new implementation of this
 * interface, not a rewrite of anything that calls it. Only the first two are
 * implemented in Phase 5 — narrative summary generation is Phase 9.
 */
export interface AIProvider {
  /** Recorded on every {@link AIGenerationRecord} this provider produces
   * (plan §17) — e.g. "anthropic" / "claude-sonnet-5". */
  readonly providerName: string;
  readonly model: string;
  analyzeJobDescription(input: AnalyzeJobDescriptionInput): Promise<JobAnalysisResult>;
  generateTemplateDraft(input: GenerateTemplateDraftInput): Promise<TemplateDraft>;
}

export class AIValidationError extends Error {
  constructor(
    message: string,
    public readonly rawOutput: unknown
  ) {
    super(message);
    this.name = "AIValidationError";
  }
}
