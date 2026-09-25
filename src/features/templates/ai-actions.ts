"use server";

import { revalidatePath } from "next/cache";
import type { InterviewLanguage } from "@/domain/interviews/interview-language";
import { getStageConfig, type InterviewStage } from "@/domain/interviews/stage-config";
import { isTemplateEditable } from "@/domain/interviews/template-versioning";
import { getJobDescription, getPosition } from "@/features/positions/queries";
import { getAIProvider } from "@/services/ai/provider";
import {
  JOB_ANALYSIS_PROMPT_VERSION,
  REGENERATE_QUESTION_PROMPT_VERSION,
  TEMPLATE_DRAFT_PROMPT_VERSION,
} from "@/services/ai/prompts";
import { AIValidationError } from "@/services/ai/types";
import { applyGeneratedDraft, applyRegeneratedQuestion, recordAIGeneration, saveJobAnalysis } from "./mutations";
import { getCompetency, getLatestJobAnalysis, getQuestion, getTemplate, listCompetencies } from "./queries";

export interface AIActionState {
  error?: string;
  /** The raw (pre-Zod) AI output, pretty-printed — shown to the reviewer so
   * a validation failure is correctable rather than a dead end (plan §28). */
  rawOutput?: string;
}

/** Both SDKs (`@anthropic-ai/sdk`, `@google/genai`) throw an error object
 * with a numeric `status` for HTTP-level failures — duck-typed here rather
 * than importing either SDK's error class, since this file has no reason to
 * depend on which provider actually made the call. */
function getErrorStatus(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status?: unknown }).status;
    return typeof status === "number" ? status : undefined;
  }
  return undefined;
}

function isNetworkError(error: unknown): boolean {
  return error instanceof Error && /ECONNREFUSED|ENOTFOUND|EAI_AGAIN|fetch failed/i.test(error.message);
}

/** Maps a raw AI-SDK/network failure to plain language (§40.2) — an
 * unmapped 401/429/network error previously reached the interviewer as the
 * SDK's own exception message unchanged. */
function describeAIError(error: unknown): AIActionState {
  if (error instanceof AIValidationError) {
    return {
      error: error.message,
      rawOutput: JSON.stringify(error.rawOutput, null, 2),
    };
  }

  const status = getErrorStatus(error);
  if (status === 401 || status === 403) {
    return { error: "AI provider rejected the API key — check it in your .env file." };
  }
  if (status === 429) {
    return { error: "Rate limited by the AI provider — try again shortly." };
  }
  if (status !== undefined && status >= 500) {
    return { error: "The AI provider is temporarily unavailable — try again shortly." };
  }
  if (isNetworkError(error)) {
    return { error: "Couldn't reach the AI provider — check your network connection and try again." };
  }
  if (error instanceof Error) return { error: error.message };
  return { error: "AI generation failed for an unknown reason." };
}

function revalidateTemplate(templateId: string) {
  revalidatePath(`/templates/${templateId}`);
}

export async function analyzeJobDescriptionAction(
  templateId: string,
  _prevState: AIActionState | undefined
): Promise<AIActionState | undefined> {
  const template = await getTemplate(templateId);
  if (!template) return { error: "Template not found." };
  if (!template.jobDescriptionId) {
    return {
      error:
        "This template isn't linked to a Job Description version. Add a Job Description on the Position, then create a new template.",
    };
  }

  const [position, jobDescription] = await Promise.all([
    getPosition(template.positionId),
    getJobDescription(template.jobDescriptionId),
  ]);
  if (!position || !jobDescription) return { error: "Position or Job Description not found." };

  try {
    const provider = getAIProvider();
    const result = await provider.analyzeJobDescription({
      positionTitle: position.title,
      roleFamily: position.roleFamily,
      seniority: position.seniority,
      stage: template.stage as InterviewStage,
      jobDescriptionText: jobDescription.rawText,
      interviewLanguage: template.interviewLanguage as InterviewLanguage,
    });

    await saveJobAnalysis(jobDescription.id, result);
    await recordAIGeneration({
      kind: "job_analysis",
      jobDescriptionId: jobDescription.id,
      provider: provider.providerName,
      model: provider.model,
      promptVersion: JOB_ANALYSIS_PROMPT_VERSION,
    });
  } catch (error) {
    return describeAIError(error);
  }

  revalidateTemplate(templateId);
  return {};
}

export async function generateTemplateDraftAction(
  templateId: string,
  _prevState: AIActionState | undefined
): Promise<AIActionState | undefined> {
  const template = await getTemplate(templateId);
  if (!template) return { error: "Template not found." };
  if (!isTemplateEditable(template)) {
    return { error: "This template version is no longer editable." };
  }
  if (!template.jobDescriptionId) {
    return { error: "This template isn't linked to a Job Description version." };
  }

  const existingCompetencies = await listCompetencies(templateId);
  if (existingCompetencies.length > 0) {
    return {
      error:
        "This template already has competencies. AI generation only populates a fresh, empty draft — remove existing competencies first, or create a new template version.",
    };
  }

  const [position, jobDescription, jobAnalysis] = await Promise.all([
    getPosition(template.positionId),
    getJobDescription(template.jobDescriptionId),
    getLatestJobAnalysis(template.jobDescriptionId),
  ]);
  if (!position || !jobDescription) return { error: "Position or Job Description not found." };
  if (!jobAnalysis) {
    return { error: "Analyze the Job Description before generating a draft template." };
  }

  const stage = template.stage as InterviewStage;
  const includeCodeExercises = getStageConfig(stage).modules.codeExercises;

  try {
    const provider = getAIProvider();
    const draft = await provider.generateTemplateDraft({
      positionTitle: position.title,
      roleFamily: position.roleFamily,
      seniority: position.seniority,
      stage,
      jobDescriptionText: jobDescription.rawText,
      jobAnalysis: {
        detectedRoleFamily: jobAnalysis.detectedRoleFamily,
        detectedSeniority: jobAnalysis.detectedSeniority,
        mandatoryRequirements: jobAnalysis.mandatoryRequirements,
        preferredRequirements: jobAnalysis.preferredRequirements,
        optionalRequirements: jobAnalysis.optionalRequirements,
        notes: jobAnalysis.notes ?? "",
      },
      includeCodeExercises,
      interviewLanguage: template.interviewLanguage as InterviewLanguage,
    });

    await applyGeneratedDraft(templateId, draft, { includeCodeExercises });
    await recordAIGeneration({
      kind: "template_draft",
      templateId,
      provider: provider.providerName,
      model: provider.model,
      promptVersion: TEMPLATE_DRAFT_PROMPT_VERSION,
      blueprint: draft.competencies.map((c) => ({
        competencyName: c.name,
        ...c.blueprint,
      })),
    });
  } catch (error) {
    return describeAIError(error);
  }

  revalidateTemplate(templateId);
  return {};
}

/**
 * Phase 6: re-calls AI for exactly one question, scoped to its own
 * competency — the rest of the template (and the question's id/order) is
 * untouched (plan's stated risk for this feature). Unlike
 * generateTemplateDraftAction, this doesn't require a JobAnalysis to exist
 * first — a hand-authored competency's question can be regenerated too, just
 * without JD grounding if none is linked.
 */
export async function regenerateQuestionAction(
  templateId: string,
  questionId: string,
  _prevState: AIActionState | undefined
): Promise<AIActionState | undefined> {
  const template = await getTemplate(templateId);
  if (!template) return { error: "Template not found." };
  if (!isTemplateEditable(template)) {
    return { error: "This template version is no longer editable." };
  }

  const question = await getQuestion(questionId);
  if (!question || question.templateId !== templateId) {
    return { error: "Question not found." };
  }

  const [position, competency, jobDescription] = await Promise.all([
    getPosition(template.positionId),
    getCompetency(question.competencyId),
    template.jobDescriptionId ? getJobDescription(template.jobDescriptionId) : null,
  ]);
  if (!position || !competency) return { error: "Position or competency not found." };

  const stage = template.stage as InterviewStage;
  const includeCodeExercises = getStageConfig(stage).modules.codeExercises;

  try {
    const provider = getAIProvider();
    const regenerated = await provider.regenerateQuestion({
      positionTitle: position.title,
      roleFamily: position.roleFamily,
      seniority: position.seniority,
      stage,
      jobDescriptionText: jobDescription?.rawText ?? null,
      competencyName: competency.name,
      competencyExpectedDepth: competency.expectedDepth,
      existingQuestion: {
        text: question.text,
        difficulty: question.difficulty,
        importance: question.importance,
      },
      includeCodeExercises,
      interviewLanguage: template.interviewLanguage as InterviewLanguage,
    });

    await applyRegeneratedQuestion(questionId, regenerated, { includeCodeExercises });
    await recordAIGeneration({
      kind: "question_regeneration",
      templateId,
      provider: provider.providerName,
      model: provider.model,
      promptVersion: REGENERATE_QUESTION_PROMPT_VERSION,
      blueprint: { questionId, competencyName: competency.name },
    });
  } catch (error) {
    return describeAIError(error);
  }

  revalidateTemplate(templateId);
  return {};
}
