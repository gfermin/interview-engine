"use server";

import { revalidatePath } from "next/cache";
import { getStageConfig, type InterviewStage } from "@/domain/interviews/stage-config";
import { isTemplateEditable } from "@/domain/interviews/template-versioning";
import { getJobDescription, getPosition } from "@/features/positions/queries";
import { getAIProvider } from "@/services/ai/provider";
import { JOB_ANALYSIS_PROMPT_VERSION, TEMPLATE_DRAFT_PROMPT_VERSION } from "@/services/ai/prompts";
import { AIValidationError } from "@/services/ai/types";
import { applyGeneratedDraft, recordAIGeneration, saveJobAnalysis } from "./mutations";
import { getLatestJobAnalysis, getTemplate, listCompetencies } from "./queries";

export interface AIActionState {
  error?: string;
  /** The raw (pre-Zod) AI output, pretty-printed — shown to the reviewer so
   * a validation failure is correctable rather than a dead end (plan §28). */
  rawOutput?: string;
}

function describeAIError(error: unknown): AIActionState {
  if (error instanceof AIValidationError) {
    return {
      error: error.message,
      rawOutput: JSON.stringify(error.rawOutput, null, 2),
    };
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
