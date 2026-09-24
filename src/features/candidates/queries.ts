import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { candidates, interviewSessions, interviewTemplates, positions } from "@/db/schema";

export function listCandidates() {
  return db.query.candidates.findMany({
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
