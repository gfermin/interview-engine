"use server";

import { revalidatePath } from "next/cache";
import type { QuestionScore } from "@/domain/scoring/types";
import { rateQuestion, updateQuestionNotes } from "./mutations";

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
export async function updateNotesAction(sessionId: string, questionId: string, formData: FormData) {
  const raw = formData.get("notes");
  const notes = typeof raw === "string" && raw.trim() ? raw.trim() : null;
  await updateQuestionNotes(sessionId, questionId, notes);
  revalidatePath(`/interviews/${sessionId}`);
}
