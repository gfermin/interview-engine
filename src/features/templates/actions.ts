"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getActiveJobDescription } from "@/features/positions/queries";
import {
  createCompetency,
  createMandatoryRequirement,
  createNewTemplateVersion,
  createQuestion,
  createTemplate,
  deleteCompetency,
  deleteMandatoryRequirement,
  deleteQuestion,
  moveCompetency,
  moveMandatoryRequirement,
  moveQuestion,
  publishTemplate,
  updateCompetency,
  updateMandatoryRequirement,
  updateQuestion,
  updateScoringConfig,
} from "./mutations";
import {
  competencyFormSchema,
  mandatoryRequirementFormSchema,
  questionFormSchema,
  scoringConfigFormSchema,
  templateFormSchema,
} from "./schemas";

export interface FormActionState {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

function revalidateTemplate(templateId: string) {
  revalidatePath(`/templates/${templateId}`);
  revalidatePath("/templates");
}

export async function createTemplateAction(
  _prevState: FormActionState | undefined,
  formData: FormData
): Promise<FormActionState | undefined> {
  const parsed = templateFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const activeJobDescription = await getActiveJobDescription(parsed.data.positionId);
  const template = await createTemplate({
    ...parsed.data,
    jobDescriptionId: activeJobDescription?.id ?? null,
  });
  revalidatePath("/templates");
  redirect(`/templates/${template.id}`);
}

export async function publishTemplateAction(
  templateId: string,
  _prevState: FormActionState | undefined
): Promise<FormActionState | undefined> {
  try {
    await publishTemplate(templateId);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not publish." };
  }
  revalidateTemplate(templateId);
  return {};
}

export async function createNewVersionAction(templateId: string) {
  const newVersion = await createNewTemplateVersion(templateId);
  revalidatePath("/templates");
  redirect(`/templates/${newVersion.id}`);
}

export async function updateScoringConfigAction(
  templateId: string,
  _prevState: FormActionState | undefined,
  formData: FormData
): Promise<FormActionState | undefined> {
  const parsed = scoringConfigFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  try {
    await updateScoringConfig(templateId, parsed.data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save." };
  }
  revalidateTemplate(templateId);
  return {};
}

// ---------------------------------------------------------------------------
// Competencies
// ---------------------------------------------------------------------------

export async function createCompetencyAction(
  templateId: string,
  _prevState: FormActionState | undefined,
  formData: FormData
): Promise<FormActionState | undefined> {
  const parsed = competencyFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  try {
    await createCompetency(templateId, parsed.data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save." };
  }
  revalidateTemplate(templateId);
  redirect(`/templates/${templateId}`);
}

export async function updateCompetencyAction(
  templateId: string,
  competencyId: string,
  _prevState: FormActionState | undefined,
  formData: FormData
): Promise<FormActionState | undefined> {
  const parsed = competencyFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  try {
    await updateCompetency(competencyId, parsed.data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save." };
  }
  revalidateTemplate(templateId);
  redirect(`/templates/${templateId}`);
}

export async function deleteCompetencyAction(templateId: string, competencyId: string) {
  try {
    await deleteCompetency(competencyId);
  } catch {
    // Guarded in the UI (controls only render on an editable template) —
    // a stale request against a since-published template is a silent no-op.
  }
  revalidateTemplate(templateId);
  redirect(`/templates/${templateId}`);
}

export async function moveCompetencyAction(
  templateId: string,
  competencyId: string,
  direction: "up" | "down"
) {
  try {
    await moveCompetency(competencyId, direction);
  } catch {
    // see deleteCompetencyAction
  }
  revalidateTemplate(templateId);
  redirect(`/templates/${templateId}`);
}

// ---------------------------------------------------------------------------
// Mandatory Requirements
// ---------------------------------------------------------------------------

export async function createMandatoryRequirementAction(
  templateId: string,
  _prevState: FormActionState | undefined,
  formData: FormData
): Promise<FormActionState | undefined> {
  const parsed = mandatoryRequirementFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  try {
    await createMandatoryRequirement(templateId, parsed.data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save." };
  }
  revalidateTemplate(templateId);
  redirect(`/templates/${templateId}`);
}

export async function updateMandatoryRequirementAction(
  templateId: string,
  requirementId: string,
  _prevState: FormActionState | undefined,
  formData: FormData
): Promise<FormActionState | undefined> {
  const parsed = mandatoryRequirementFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  try {
    await updateMandatoryRequirement(requirementId, parsed.data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save." };
  }
  revalidateTemplate(templateId);
  redirect(`/templates/${templateId}`);
}

export async function deleteMandatoryRequirementAction(
  templateId: string,
  requirementId: string
) {
  try {
    await deleteMandatoryRequirement(requirementId);
  } catch {
    // see deleteCompetencyAction
  }
  revalidateTemplate(templateId);
  redirect(`/templates/${templateId}`);
}

export async function moveMandatoryRequirementAction(
  templateId: string,
  requirementId: string,
  direction: "up" | "down"
) {
  try {
    await moveMandatoryRequirement(requirementId, direction);
  } catch {
    // see deleteCompetencyAction
  }
  revalidateTemplate(templateId);
  redirect(`/templates/${templateId}`);
}

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

export async function createQuestionAction(
  templateId: string,
  _prevState: FormActionState | undefined,
  formData: FormData
): Promise<FormActionState | undefined> {
  const parsed = questionFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  try {
    await createQuestion(templateId, parsed.data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save." };
  }
  revalidateTemplate(templateId);
  redirect(`/templates/${templateId}`);
}

export async function updateQuestionAction(
  templateId: string,
  questionId: string,
  _prevState: FormActionState | undefined,
  formData: FormData
): Promise<FormActionState | undefined> {
  const parsed = questionFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  try {
    await updateQuestion(questionId, parsed.data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save." };
  }
  revalidateTemplate(templateId);
  redirect(`/templates/${templateId}`);
}

export async function deleteQuestionAction(templateId: string, questionId: string) {
  try {
    await deleteQuestion(questionId);
  } catch {
    // see deleteCompetencyAction
  }
  revalidateTemplate(templateId);
  redirect(`/templates/${templateId}`);
}

export async function moveQuestionAction(
  templateId: string,
  questionId: string,
  direction: "up" | "down"
) {
  try {
    await moveQuestion(questionId, direction);
  } catch {
    // see deleteCompetencyAction
  }
  revalidateTemplate(templateId);
  redirect(`/templates/${templateId}`);
}
