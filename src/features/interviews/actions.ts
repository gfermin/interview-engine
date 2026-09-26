"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { MandatoryRequirementStatus, QuestionScore } from "@/domain/scoring/types";
import {
  archiveSession,
  deleteSession,
  finishRating,
  rateQuestion,
  recordDecision,
  reopenSession,
  restoreSession,
  updateEnglishAssessment,
  updateMandatoryRequirementStatus,
  updateQuestionNotes,
} from "./mutations";
import { decisionFormSchema } from "./schemas";

export interface FormActionState {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

/** Bound with `.rateQuestionAction.bind(null, sessionId, questionId, value)`
 * per rate-bar button (plan §28's "autosave on every change") — a discrete
 * click, so there's nothing to debounce and no field-level error to surface,
 * matching the fire-and-forget `RowActionButton` pattern already used for
 * template row actions. */
export async function rateQuestionAction(
  sessionId: string,
  questionId: string,
  value: QuestionScore
) {
  await rateQuestion(sessionId, questionId, value);
  revalidatePath(`/interviews/${sessionId}`);
}

/** Bound with `.bind(null, sessionId, questionId)`, submitted on blur (see
 * NotesField) rather than on every keystroke — the plan's own risk note
 * ("recomputing on every keystroke could be wasteful") applies to
 * persistence too, not just score recompute. */
/** Notes have no upper bound at the schema level (this isn't backed by a
 * Zod schema at all — see NotesField), so §40.4's cap is applied here
 * instead, matching the plan's other free-text field bounds. */
const MAX_NOTES_LENGTH = 5000;

export async function updateNotesAction(sessionId: string, questionId: string, formData: FormData) {
  const raw = formData.get("notes");
  const trimmed = typeof raw === "string" ? raw.trim().slice(0, MAX_NOTES_LENGTH) : "";
  const notes = trimmed ? trimmed : null;
  await updateQuestionNotes(sessionId, questionId, notes);
  revalidatePath(`/interviews/${sessionId}`);
}

/** Bound per tri-state button on the Summary screen's MandatoryRequirement
 * list, same fire-and-forget shape as {@link rateQuestionAction}. */
export async function updateMandatoryRequirementStatusAction(
  sessionId: string,
  requirementId: string,
  status: MandatoryRequirementStatus
) {
  await updateMandatoryRequirementStatus(sessionId, requirementId, status);
  revalidatePath(`/interviews/${sessionId}/summary`);
}

/** Bound per level button (1-5) or the clear button, mirroring RateBar. */
export async function updateEnglishAssessmentAction(sessionId: string, level: number | null) {
  await updateEnglishAssessment(sessionId, level);
  revalidatePath(`/interviews/${sessionId}/summary`);
}

/** "View Summary" from the live rating screen — marks the session
 * `completed` (a no-op if it already is) and navigates there. A real POST
 * rather than a plain link so the lifecycle transition happens in a Server
 * Action, not as a side effect of a GET page load. */
export async function finishRatingAction(sessionId: string) {
  await finishRating(sessionId);
  revalidatePath(`/interviews/${sessionId}`);
  redirect(`/interviews/${sessionId}/summary`);
}

export async function recordDecisionAction(
  sessionId: string,
  _prevState: FormActionState | undefined,
  formData: FormData
): Promise<FormActionState | undefined> {
  const parsed = decisionFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await recordDecision(sessionId, parsed.data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not record the decision." };
  }
  revalidatePath(`/interviews/${sessionId}/summary`);
  revalidatePath(`/candidates`);
  return {};
}

/** Reopens a finished session and sends the interviewer back to the rating
 * screen, where ratings are editable again (plan §16/Phase 11). */
export async function reopenSessionAction(sessionId: string) {
  await reopenSession(sessionId);
  revalidatePath(`/interviews/${sessionId}`);
  revalidatePath(`/interviews/${sessionId}/summary`);
  redirect(`/interviews/${sessionId}`);
}

/**
 * Plan Phase 23/§44 — fire-and-forget, matching the Templates feature's own
 * `deleteCompetencyAction` pattern: the Summary page only ever renders this
 * button when `canDeleteSession` already holds, so a call here is expected
 * to succeed; a stale/guarded request is a silent no-op rather than a
 * crash. The session no longer exists afterward, so this redirects to the
 * global Interview History list rather than revalidating a page that's
 * gone.
 */
export async function deleteSessionAction(sessionId: string) {
  try {
    await deleteSession(sessionId);
  } catch {
    // see deleteCompetencyAction's identical note in features/templates/actions.ts
  }
  revalidatePath("/interviews");
  revalidatePath("/candidates");
  redirect("/interviews");
}

export async function archiveSessionAction(sessionId: string) {
  await archiveSession(sessionId);
  revalidatePath(`/interviews/${sessionId}/summary`);
  revalidatePath("/interviews");
  revalidatePath("/candidates");
}

export async function restoreSessionAction(sessionId: string) {
  await restoreSession(sessionId);
  revalidatePath(`/interviews/${sessionId}/summary`);
  revalidatePath("/interviews");
  revalidatePath("/candidates");
}
