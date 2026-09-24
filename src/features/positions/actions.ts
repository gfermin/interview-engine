"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { saveJobDescription } from "./job-description";
import { createPosition, updatePosition } from "./mutations";
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
