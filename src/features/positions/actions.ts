"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { type FormActionState, parseFormOrError } from "@/lib/form-action-state";
import { getRequestLocale } from "@/features/settings/locale";
import { saveJobDescription } from "./job-description";
import { archivePosition, createPosition, deletePosition, restorePosition, updatePosition } from "./mutations";
import { jobDescriptionFormSchema, positionFormSchema } from "./schemas";

export type { FormActionState };

export async function createPositionAction(
  _prevState: FormActionState | undefined,
  formData: FormData
): Promise<FormActionState | undefined> {
  const parsed = parseFormOrError(positionFormSchema, formData, await getRequestLocale());
  if (parsed.error) return parsed.error;

  const position = await createPosition(parsed.data);
  revalidatePath("/positions");
  redirect(`/positions/${position.id}`);
}

export async function updatePositionAction(
  positionId: string,
  _prevState: FormActionState | undefined,
  formData: FormData
): Promise<FormActionState | undefined> {
  const parsed = parseFormOrError(positionFormSchema, formData, await getRequestLocale());
  if (parsed.error) return parsed.error;

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
  const parsed = parseFormOrError(jobDescriptionFormSchema, formData, await getRequestLocale());
  if (parsed.error) return parsed.error;

  await saveJobDescription(positionId, parsed.data.rawText);
  revalidatePath(`/positions/${positionId}`);
  return {};
}

/** Plan Phase 23/§44 — the Position detail page only ever renders this
 * button when the precondition (`canDeletePosition`) already holds, so a
 * call here is expected to succeed. Plan Phase 34/L-16 — a stale/guarded
 * request (a TOCTOU race: a Session got created against one of this
 * Position's Templates between the button rendering and the click landing)
 * is no longer a silent no-op that redirects away as if it had succeeded —
 * it instead returns to the Position's own page, whose existing "cannot be
 * permanently deleted" note (driven by the same precondition check) then
 * renders automatically on the next request, giving real feedback instead
 * of none. The position no longer exists after an actual success, so that
 * path still redirects to the Positions list rather than a page that's gone. */
export async function deletePositionAction(positionId: string) {
  try {
    await deletePosition(positionId);
  } catch {
    revalidatePath(`/positions/${positionId}`);
    redirect(`/positions/${positionId}`);
    return;
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
