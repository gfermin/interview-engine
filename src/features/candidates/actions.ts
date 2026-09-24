"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createCandidate, startInterviewSession, updateCandidate } from "./mutations";
import { candidateFormSchema, startSessionFormSchema } from "./schemas";

export interface FormActionState {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

export async function createCandidateAction(
  _prevState: FormActionState | undefined,
  formData: FormData
): Promise<FormActionState | undefined> {
  const parsed = candidateFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const candidate = await createCandidate(parsed.data);
  revalidatePath("/candidates");
  redirect(`/candidates/${candidate.id}`);
}

export async function updateCandidateAction(
  candidateId: string,
  _prevState: FormActionState | undefined,
  formData: FormData
): Promise<FormActionState | undefined> {
  const parsed = candidateFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  await updateCandidate(candidateId, parsed.data);
  revalidatePath("/candidates");
  revalidatePath(`/candidates/${candidateId}`);
  redirect(`/candidates/${candidateId}`);
}

export async function startSessionAction(
  candidateId: string,
  _prevState: FormActionState | undefined,
  formData: FormData
): Promise<FormActionState | undefined> {
  const parsed = startSessionFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await startInterviewSession(candidateId, parsed.data.templateId);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not start the session." };
  }
  revalidatePath(`/candidates/${candidateId}`);
  revalidatePath("/templates");
  return {};
}
