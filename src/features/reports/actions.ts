"use server";

import { revalidatePath } from "next/cache";
import { deleteReport, generateReport } from "./mutations";

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

/** Plan Phase 23/§44 — always allowed (no dependency guard needed, see
 * `deleteReport`), so this follows the same fire-and-forget
 * `RowActionButton` shape the Templates feature already uses for its own
 * always-safe row deletes, rather than the `FormActionState` shape. Bound
 * with both ids so a single row action can revalidate both places a report
 * is listed. */
export async function deleteReportAction(reportId: string, sessionId: string) {
  await deleteReport(reportId);
  revalidatePath(`/interviews/${sessionId}/summary`);
  revalidatePath("/reports");
}
