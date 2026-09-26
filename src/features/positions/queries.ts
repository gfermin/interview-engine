import { desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/db";
import { interviewSessions, interviewTemplates, jobDescriptions, positions } from "@/db/schema";

export interface PositionListFilters {
  /** Plan Phase 23/§44.9 — defaults to "active" so archived Positions never
   * clutter the default list or any picker (Template/Candidate creation)
   * built on this same query. */
  archived?: "active" | "archived" | "all";
}

export function listPositions(filters: PositionListFilters = {}) {
  const archived = filters.archived ?? "active";
  return db.query.positions.findMany({
    where:
      archived === "all"
        ? undefined
        : archived === "archived"
          ? isNotNull(positions.archivedAt)
          : isNull(positions.archivedAt),
    orderBy: [desc(positions.createdAt)],
  });
}

export function getPosition(id: string) {
  return db.query.positions.findFirst({ where: eq(positions.id, id) });
}

/**
 * How many of a Position's templates have ever had a Session started
 * against them (plan Phase 23/§44.4/§44.5) — the ground truth `deletePosition`
 * (mutations.ts) and the Position detail page both call, so the "can this be
 * deleted" decision can never diverge between what the UI predicts and what
 * the mutation actually enforces. Deliberately checks Session existence
 * directly rather than trusting each template's `status === "locked"`: that
 * field is set by a second, non-atomic write in `startInterviewSession`
 * (features/candidates/mutations.ts), so it can lag reality.
 */
export async function countUsedTemplatesForPosition(positionId: string): Promise<number> {
  const templates = await db.query.interviewTemplates.findMany({
    where: eq(interviewTemplates.positionId, positionId),
    columns: { id: true },
  });
  const templateIds = templates.map((t) => t.id);
  if (templateIds.length === 0) return 0;

  const rows = await db
    .select({ templateId: interviewSessions.templateId })
    .from(interviewSessions)
    .where(inArray(interviewSessions.templateId, templateIds));
  return new Set(rows.map((row) => row.templateId)).size;
}

/** The Job Description a Position is currently interviewing against. There is
 * at most one "active" JobDescription per Position at a time (superseded
 * versions are kept for history, not shown here) — see
 * src/features/positions/job-description.ts for how a version transition
 * happens. */
export function getActiveJobDescription(positionId: string) {
  return db.query.jobDescriptions.findFirst({
    where: (jd, { and, eq }) =>
      and(eq(jd.positionId, positionId), eq(jd.status, "active")),
    orderBy: [desc(jobDescriptions.version)],
  });
}

export function getJobDescription(id: string) {
  return db.query.jobDescriptions.findFirst({ where: eq(jobDescriptions.id, id) });
}

export function listJobDescriptionVersions(positionId: string) {
  return db.query.jobDescriptions.findMany({
    where: eq(jobDescriptions.positionId, positionId),
    orderBy: [desc(jobDescriptions.version)],
  });
}
