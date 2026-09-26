import { eq } from "drizzle-orm";
import { db } from "@/db";
import { candidates, interviewSessions, interviewTemplates } from "@/db/schema";
import { canDeleteCandidate } from "@/domain/candidates/lifecycle";
import { canStartSession, statusAfterSessionCreated } from "@/domain/interviews/template-versioning";
import { getTemplate } from "@/features/templates/queries";
import type { CandidateFormValues } from "./schemas";
import { getCandidate, listSessionsForCandidate } from "./queries";

export async function createCandidate(input: CandidateFormValues) {
  const [candidate] = await db.insert(candidates).values(input).returning();
  return candidate;
}

export async function updateCandidate(id: string, input: CandidateFormValues) {
  const [candidate] = await db
    .update(candidates)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(candidates.id, id))
    .returning();
  return candidate;
}

/**
 * Starts a new InterviewSession for a candidate against a specific,
 * immutable Template version (plan §16/§22) — the first real exercise of
 * the lock-on-use guard Phase 4 wrote ahead of time (ADR-008).
 */
export async function startInterviewSession(candidateId: string, templateId: string) {
  // A bad/tampered candidateId (this action is reached via a bound server
  // action whose first argument comes from the URL, not form data — §40.2)
  // would otherwise reach the insert below and surface SQLite's raw
  // "FOREIGN KEY constraint failed" instead of a clean message.
  const candidate = await getCandidate(candidateId);
  if (!candidate) throw new Error("Candidate not found.");

  const template = await getTemplate(templateId);
  if (!template) throw new Error("Template not found.");
  if (!canStartSession(template)) {
    throw new Error(
      "Only a published (approved or locked) template can be used to start an interview."
    );
  }

  const [session] = await db
    .insert(interviewSessions)
    .values({ candidateId, templateId })
    .returning();

  const nextStatus = statusAfterSessionCreated(template);
  if (nextStatus !== template.status) {
    await db
      .update(interviewTemplates)
      .set({ status: nextStatus, updatedAt: new Date() })
      .where(eq(interviewTemplates.id, templateId));
  }

  return session;
}

/**
 * Deletes a Candidate (plan Phase 23/§44.4) — allowed only when they have
 * zero interview sessions. This is the single highest-risk gap the
 * analysis identified (§44.3): `Candidate -> InterviewSession` is `CASCADE`
 * at the DB level with no `RESTRICT`, so this domain-layer check is the
 * only thing standing between this action and silently destroying a
 * finalized hiring evaluation. Archive is the only removal path once any
 * session exists.
 */
export async function deleteCandidate(id: string) {
  const candidate = await getCandidate(id);
  if (!candidate) throw new Error("Candidate not found.");

  const sessions = await listSessionsForCandidate(id);
  const check = canDeleteCandidate(sessions.length);
  if (!check.allowed) throw new Error(check.reason);

  await db.delete(candidates).where(eq(candidates.id, id));
}

/** Archives a candidate (plan Phase 23/§44.4) — hides them from the default
 * Candidates list and Dashboard, but their detail page and every session/
 * report under it remain fully intact and directly reachable. */
export async function archiveCandidate(id: string) {
  const candidate = await getCandidate(id);
  if (!candidate) throw new Error("Candidate not found.");
  await db
    .update(candidates)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(eq(candidates.id, id));
}

export async function restoreCandidate(id: string) {
  const candidate = await getCandidate(id);
  if (!candidate) throw new Error("Candidate not found.");
  await db
    .update(candidates)
    .set({ archivedAt: null, updatedAt: new Date() })
    .where(eq(candidates.id, id));
}
