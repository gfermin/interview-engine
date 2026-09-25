import type { z } from "zod";
import type { InterviewLanguage } from "@/domain/interviews/interview-language";
import type { InterviewStage } from "@/domain/interviews/stage-config";
import type { JobAnalysisResult, TemplateDraft, TemplateDraftQuestion } from "./schemas";

export interface AnalyzeJobDescriptionInput {
  positionTitle: string;
  roleFamily: string | null;
  seniority: string | null;
  stage: InterviewStage;
  jobDescriptionText: string;
  /** The template's own interview content language (plan Phase 21/§42) —
   * explicit, never inferred from the JD text. */
  interviewLanguage: InterviewLanguage;
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
  /** The template's own interview content language (plan Phase 21/§42) —
   * explicit, never inferred from the JD text. */
  interviewLanguage: InterviewLanguage;
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
  /** The template's own interview content language (plan Phase 21/§42). */
  interviewLanguage: InterviewLanguage;
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
 * delete-and-recreate). Phase 9 ended up building the narrative summary as
 * a deterministic, template-string function (`domain/interviews/
 * narrative.ts`) rather than an AI call, so it isn't part of this
 * interface.
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

/**
 * A short, human-readable summary of a failed Zod parse (§40.2) — used
 * instead of interpolating `error.message` directly, which in Zod 4 is a
 * multi-line JSON dump of every issue. The full raw AI output is already
 * shown separately to the reviewer for correction (plan §28, ai-actions.ts's
 * `rawOutput`); this string is only meant to say *what* went wrong at a
 * glance, not duplicate that dump.
 */
export function summarizeValidationIssues(error: z.ZodError, limit = 3): string {
  const parts = error.issues.slice(0, limit).map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "(value)";
    return `${path}: ${issue.message}`;
  });
  const remaining = error.issues.length - parts.length;
  return remaining > 0 ? `${parts.join("; ")} (+${remaining} more)` : parts.join("; ");
}
