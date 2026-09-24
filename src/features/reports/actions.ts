"use server";

import { revalidatePath } from "next/cache";
import { generateReport } from "./mutations";

export interface FormActionState {
  error?: string;
}

export async function generateReportAction(
  sessionId: string,
  _prevState: FormActionState | undefined
): Promise<FormActionState | undefined> {
  try {
    await generateReport(sessionId);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not generate the report." };
  }
  revalidatePath(`/interviews/${sessionId}/summary`);
  return {};
}
