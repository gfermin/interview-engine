import { eq } from "drizzle-orm";
import { db } from "@/db";
import { positions } from "@/db/schema";
import { canDeletePosition } from "@/domain/positions/lifecycle";
import type { PositionFormValues } from "./schemas";
import { countUsedTemplatesForPosition, getPosition } from "./queries";

export async function createPosition(input: PositionFormValues) {
  const [position] = await db.insert(positions).values(input).returning();
  return position;
}

export async function updatePosition(id: string, input: PositionFormValues) {
  const [position] = await db
    .update(positions)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(positions.id, id))
    .returning();
  return position;
}

/**
 * Deletes a Position (plan Phase 23/§44.4) — allowed only when none of its
 * templates have ever had a Session started against them
 * ({@link countUsedTemplatesForPosition}, shared with the Position detail
 * page so the "can this be deleted" decision can never diverge between
 * what's displayed and what's enforced). Cascades (DB-level) through its
 * JobDescriptions/JobAnalyses and any genuinely session-free templates
 * (with their Competencies/MandatoryRequirements/Questions).
 */
export async function deletePosition(id: string) {
  const position = await getPosition(id);
  if (!position) throw new Error("Position not found.");

  const usedTemplateCount = await countUsedTemplatesForPosition(id);
  const check = canDeletePosition(usedTemplateCount);
  if (!check.allowed) throw new Error(check.reason);

  await db.delete(positions).where(eq(positions.id, id));
}

/** Archives a position (plan Phase 23/§44.4) — hides it from the default
 * Positions list and the position picker on Template creation, without
 * touching any of its templates, sessions, or reports. */
export async function archivePosition(id: string) {
  const position = await getPosition(id);
  if (!position) throw new Error("Position not found.");
  await db
    .update(positions)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(eq(positions.id, id));
}

export async function restorePosition(id: string) {
  const position = await getPosition(id);
  if (!position) throw new Error("Position not found.");
  await db
    .update(positions)
    .set({ archivedAt: null, updatedAt: new Date() })
    .where(eq(positions.id, id));
}
