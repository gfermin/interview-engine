import type { InterviewStage } from "@/domain/interviews/stage-config";
import type { JobAnalysisResult, TemplateDraft, TemplateDraftQuestion } from "./schemas";

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

export interface RegenerateQuestionInput {
  positionTitle: string;
  roleFamily: string | null;
  seniority: string | null;
  stage: InterviewStage;
  /** Grounding context, when the template has one — a hand-authored
   * competency with no linked JobDescription can still be regenerated
   * against, just without JD grounding. */
  jobDescriptionText: string | null;
  competencyName: string;
  competencyExpectedDepth: string | null;
  /** What's being replaced — steers the model toward a genuinely different
   * question on the same competency, not a reworded duplicate. */
  existingQuestion: {
    text: string;
    difficulty: TemplateDraftQuestion["difficulty"];
    importance: TemplateDraftQuestion["importance"];
  };
  includeCodeExercises: boolean;
}

/**
 * The AI-assisted touch points (plan §17) behind one interface, so a second
 * provider (Gemini, a local model) is a new implementation of this
 * interface, not a rewrite of anything that calls it. `regenerateQuestion`
 * is Phase 6's addition (re-calls AI for one question, scoped to a single
 * competency, without touching the rest of the template — plan's stated
 * risk is that this must not drift the question's id/order, which is why
 * the persistence layer replaces the row in place rather than
 * delete-and-recreate). Narrative summary generation remains Phase 9.
 */
export interface AIProvider {
  /** Recorded on every {@link AIGenerationRecord} this provider produces
   * (plan §17) — e.g. "anthropic" / "claude-sonnet-5". */
  readonly providerName: string;
  readonly model: string;
  analyzeJobDescription(input: AnalyzeJobDescriptionInput): Promise<JobAnalysisResult>;
  generateTemplateDraft(input: GenerateTemplateDraftInput): Promise<TemplateDraft>;
  regenerateQuestion(input: RegenerateQuestionInput): Promise<TemplateDraftQuestion>;
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
