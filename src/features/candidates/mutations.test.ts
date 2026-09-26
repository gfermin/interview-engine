// @vitest-environment node
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { interviewTemplates, positions } from "@/db/schema";
import { createCompetency, publishTemplate } from "@/features/templates/mutations";
import {
  archiveCandidate,
  createCandidate,
  deleteCandidate,
  restoreCandidate,
  startInterviewSession,
  updateCandidate,
} from "./mutations";

async function createTestCandidate() {
  return createCandidate({
    name: `Test Candidate ${randomUUID()}`,
    email: null,
    notes: null,
  });
}

async function createTestTemplate(status: "draft" | "approved" = "draft") {
  const [position] = await db
    .insert(positions)
    .values({ title: `Test Position ${randomUUID()}` })
    .returning();
  const [template] = await db
    .insert(interviewTemplates)
    .values({ positionId: position.id, stage: "technical", name: "Test Template" })
    .returning();

  if (status === "approved") {
    await createCompetency(template.id, {
      name: "Programming",
      weight: 100,
      critical: false,
      expectedDepth: null,
    });
    await publishTemplate(template.id);
  }

  return db.query.interviewTemplates.findFirst({
    where: eq(interviewTemplates.id, template.id),
  });
}

describe("createCandidate / updateCandidate", () => {
  it("persists and updates candidate fields", async () => {
    const candidate = await createCandidate({
      name: "Jordan Rivera",
      email: "jordan@example.com",
      notes: "Referred by a friend.",
    });
    expect(candidate.name).toBe("Jordan Rivera");
    expect(candidate.email).toBe("jordan@example.com");

    const updated = await updateCandidate(candidate.id, {
      name: "Jordan Rivera-Smith",
      email: null,
      notes: null,
    });
    expect(updated.name).toBe("Jordan Rivera-Smith");
    expect(updated.email).toBeNull();
  });
});

describe("startInterviewSession", () => {
  it("throws when the template doesn't exist", async () => {
    const candidate = await createTestCandidate();
    await expect(startInterviewSession(candidate.id, randomUUID())).rejects.toThrow(
      /not found/
    );
  });

  it("refuses to start a session against a draft (unpublished) template", async () => {
    const candidate = await createTestCandidate();
    const template = await createTestTemplate("draft");

    await expect(startInterviewSession(candidate.id, template!.id)).rejects.toThrow(
      /published/
    );
  });

  it("creates a session and locks an approved template on first use (ADR-008)", async () => {
    const candidate = await createTestCandidate();
    const template = await createTestTemplate("approved");
    expect(template!.status).toBe("approved");

    const session = await startInterviewSession(candidate.id, template!.id);
    expect(session.candidateId).toBe(candidate.id);
    expect(session.templateId).toBe(template!.id);

    const reloaded = await db.query.interviewTemplates.findFirst({
      where: eq(interviewTemplates.id, template!.id),
    });
    expect(reloaded?.status).toBe("locked");
  });

  it("allows a second candidate's session against an already-locked template", async () => {
    const template = await createTestTemplate("approved");
    const firstCandidate = await createTestCandidate();
    await startInterviewSession(firstCandidate.id, template!.id);

    const secondCandidate = await createTestCandidate();
    const secondSession = await startInterviewSession(secondCandidate.id, template!.id);
    expect(secondSession.candidateId).toBe(secondCandidate.id);

    const reloaded = await db.query.interviewTemplates.findFirst({
      where: eq(interviewTemplates.id, template!.id),
    });
    expect(reloaded?.status).toBe("locked");
  });
});

// Plan Phase 23/§44.4 — the single highest-risk gap the analysis identified
// (§44.3): Candidate -> InterviewSession is CASCADE with no DB-level
// RESTRICT, so this domain-layer check is the only thing standing between
// deleteCandidate and silently destroying a finalized hiring evaluation.
describe("deleteCandidate / archiveCandidate / restoreCandidate", () => {
  it("deletes a candidate with zero sessions", async () => {
    const candidate = await createTestCandidate();
    await deleteCandidate(candidate.id);
    const reloaded = await db.query.candidates.findFirst({ where: (c, { eq: eqOp }) => eqOp(c.id, candidate.id) });
    expect(reloaded).toBeUndefined();
  });

  it("refuses to delete a candidate with an existing session, even in_progress", async () => {
    const candidate = await createTestCandidate();
    const template = await createTestTemplate("approved");
    await startInterviewSession(candidate.id, template!.id);

    await expect(deleteCandidate(candidate.id)).rejects.toThrow(/cannot be permanently deleted/);

    // The candidate and their session must survive the rejected attempt.
    const reloaded = await db.query.candidates.findFirst({ where: (c, { eq: eqOp }) => eqOp(c.id, candidate.id) });
    expect(reloaded).toBeDefined();
  });

  it("archives and restores a candidate", async () => {
    const candidate = await createTestCandidate();
    await archiveCandidate(candidate.id);
    const afterArchive = await db.query.candidates.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, candidate.id),
    });
    expect(afterArchive?.archivedAt).not.toBeNull();

    await restoreCandidate(candidate.id);
    const afterRestore = await db.query.candidates.findFirst({
      where: (c, { eq: eqOp }) => eqOp(c.id, candidate.id),
    });
    expect(afterRestore?.archivedAt).toBeNull();
  });
});
