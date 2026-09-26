"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  archiveCandidate,
  createCandidate,
  deleteCandidate,
  restoreCandidate,
  startInterviewSession,
  updateCandidate,
} from "./mutations";
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

/** Plan Phase 23/§44 — the Candidate detail page only ever renders this
 * button when the precondition (`canDeleteCandidate`) already holds, so a
 * call here is expected to succeed; a stale/guarded request is a silent
 * no-op, matching the Templates feature's own `deleteCompetencyAction`
 * pattern. */
export async function deleteCandidateAction(candidateId: string) {
  try {
    await deleteCandidate(candidateId);
  } catch {
    // see deleteCompetencyAction's identical note in features/templates/actions.ts
  }
  revalidatePath("/candidates");
  redirect("/candidates");
}

export async function archiveCandidateAction(candidateId: string) {
  await archiveCandidate(candidateId);
  revalidatePath("/candidates");
  revalidatePath(`/candidates/${candidateId}`);
}

export async function restoreCandidateAction(candidateId: string) {
  await restoreCandidate(candidateId);
  revalidatePath("/candidates");
  revalidatePath(`/candidates/${candidateId}`);
}
