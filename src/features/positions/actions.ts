"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { saveJobDescription } from "./job-description";
import { archivePosition, createPosition, deletePosition, restorePosition, updatePosition } from "./mutations";
import { jobDescriptionFormSchema, positionFormSchema } from "./schemas";

export interface FormActionState {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

export async function createPositionAction(
  _prevState: FormActionState | undefined,
  formData: FormData
): Promise<FormActionState | undefined> {
  const parsed = positionFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const position = await createPosition(parsed.data);
  revalidatePath("/positions");
  redirect(`/positions/${position.id}`);
}

export async function updatePositionAction(
  positionId: string,
  _prevState: FormActionState | undefined,
  formData: FormData
): Promise<FormActionState | undefined> {
  const parsed = positionFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  await updatePosition(positionId, parsed.data);
  revalidatePath("/positions");
  revalidatePath(`/positions/${positionId}`);
  redirect(`/positions/${positionId}`);
}

export async function saveJobDescriptionAction(
  positionId: string,
  _prevState: FormActionState | undefined,
  formData: FormData
): Promise<FormActionState | undefined> {
  const parsed = jobDescriptionFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  await saveJobDescription(positionId, parsed.data.rawText);
  revalidatePath(`/positions/${positionId}`);
  return {};
}

/** Plan Phase 23/§44 — the Position detail page only ever renders this
 * button when the precondition (`canDeletePosition`) already holds, so a
 * call here is expected to succeed; a stale/guarded request is a silent
 * no-op, matching the Templates feature's own `deleteCompetencyAction`
 * pattern. The position no longer exists afterward, so this redirects to
 * the Positions list rather than revalidating a page that's gone. */
export async function deletePositionAction(positionId: string) {
  try {
    await deletePosition(positionId);
  } catch {
    // see deleteCompetencyAction's identical note in features/templates/actions.ts
  }
  revalidatePath("/positions");
  redirect("/positions");
}

export async function archivePositionAction(positionId: string) {
  await archivePosition(positionId);
  revalidatePath("/positions");
  revalidatePath(`/positions/${positionId}`);
}

export async function restorePositionAction(positionId: string) {
  await restorePosition(positionId);
  revalidatePath("/positions");
  revalidatePath(`/positions/${positionId}`);
}
