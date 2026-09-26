import { desc, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/db";
import { candidates, interviewSessions, interviewTemplates, positions } from "@/db/schema";

export interface CandidateListFilters {
  /** Plan Phase 23/§44.9 — defaults to "active" so archived Candidates
   * never clutter the default list or Dashboard. */
  archived?: "active" | "archived" | "all";
}

export function listCandidates(filters: CandidateListFilters = {}) {
  const archived = filters.archived ?? "active";
  return db.query.candidates.findMany({
    where:
      archived === "all"
        ? undefined
        : archived === "archived"
          ? isNotNull(candidates.archivedAt)
          : isNull(candidates.archivedAt),
    orderBy: [desc(candidates.createdAt)],
  });
}

export function getCandidate(id: string) {
  return db.query.candidates.findFirst({ where: eq(candidates.id, id) });
}

/** All of a candidate's sessions across positions/stages/attempts (plan
 * §16/§23) — a Candidate can have many, e.g. Screening then Technical, or a
 * re-interview at a later template version. */
export function listSessionsForCandidate(candidateId: string) {
  return db
    .select({
      id: interviewSessions.id,
      status: interviewSessions.status,
      archivedAt: interviewSessions.archivedAt,
      createdAt: interviewSessions.createdAt,
      templateId: interviewTemplates.id,
      templateName: interviewTemplates.name,
      templateVersion: interviewTemplates.version,
      stage: interviewTemplates.stage,
      positionId: positions.id,
      positionTitle: positions.title,
    })
    .from(interviewSessions)
    .innerJoin(interviewTemplates, eq(interviewSessions.templateId, interviewTemplates.id))
    .innerJoin(positions, eq(interviewTemplates.positionId, positions.id))
    .where(eq(interviewSessions.candidateId, candidateId))
    .orderBy(desc(interviewSessions.createdAt));
}
