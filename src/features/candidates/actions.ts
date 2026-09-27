"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { type FormActionState, parseFormOrError } from "@/lib/form-action-state";
import { t } from "@/lib/i18n";
import { getRequestLocale } from "@/features/settings/locale";
import {
  archiveCandidate,
  createCandidate,
  deleteCandidate,
  restoreCandidate,
  startInterviewSession,
  updateCandidate,
} from "./mutations";
import { candidateFormSchema, startSessionFormSchema } from "./schemas";

export type { FormActionState };

export async function createCandidateAction(
  _prevState: FormActionState | undefined,
  formData: FormData
): Promise<FormActionState | undefined> {
  const parsed = parseFormOrError(candidateFormSchema, formData, await getRequestLocale());
  if (parsed.error) return parsed.error;

  const candidate = await createCandidate(parsed.data);
  revalidatePath("/candidates");
  redirect(`/candidates/${candidate.id}`);
}

export async function updateCandidateAction(
  candidateId: string,
  _prevState: FormActionState | undefined,
  formData: FormData
): Promise<FormActionState | undefined> {
  const parsed = parseFormOrError(candidateFormSchema, formData, await getRequestLocale());
  if (parsed.error) return parsed.error;

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
  const locale = await getRequestLocale();
  const parsed = parseFormOrError(startSessionFormSchema, formData, locale);
  if (parsed.error) return parsed.error;

  try {
    await startInterviewSession(candidateId, parsed.data.templateId);
  } catch (error) {
    return { error: error instanceof Error ? error.message : t(locale, "common.couldNotStartSession") };
  }
  revalidatePath(`/candidates/${candidateId}`);
  revalidatePath("/templates");
  return {};
}

/** Plan Phase 23/§44 — the Candidate detail page only ever renders this
 * button when the precondition (`canDeleteCandidate`) already holds, so a
 * call here is expected to succeed. Plan Phase 34/L-16 — a stale/guarded
 * request (a TOCTOU race: a Session got created for this candidate between
 * the button rendering and the click landing) is no longer a silent no-op
 * that redirects away as if it had succeeded — it instead returns to the
 * Candidate's own page, whose existing "cannot be permanently deleted" note
 * (driven by the same precondition check) then renders automatically on the
 * next request. The candidate no longer exists after an actual success, so
 * that path still redirects to the Candidates list. */
export async function deleteCandidateAction(candidateId: string) {
  try {
    await deleteCandidate(candidateId);
  } catch {
    revalidatePath(`/candidates/${candidateId}`);
    redirect(`/candidates/${candidateId}`);
    return;
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
