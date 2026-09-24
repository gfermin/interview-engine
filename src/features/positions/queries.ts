import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { jobDescriptions, positions } from "@/db/schema";

export function listPositions() {
  return db.query.positions.findMany({
    orderBy: [desc(positions.createdAt)],
  });
}

export function getPosition(id: string) {
  return db.query.positions.findFirst({ where: eq(positions.id, id) });
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
