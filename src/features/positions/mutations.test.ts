// @vitest-environment node
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { candidates, interviewTemplates } from "@/db/schema";
import { startInterviewSession } from "@/features/candidates/mutations";
import { createCompetency, publishTemplate } from "@/features/templates/mutations";
import { archivePosition, createPosition, deletePosition, restorePosition } from "./mutations";

async function createTestPosition() {
  return createPosition({
    title: `Test Position ${randomUUID()}`,
    department: null,
    roleFamily: null,
    seniority: null,
  });
}

async function createLockedTemplateForPosition(positionId: string) {
  const [template] = await db
    .insert(interviewTemplates)
    .values({ positionId, stage: "technical", name: "Test Template" })
    .returning();
  await createCompetency(template.id, { name: "Programming", weight: 100, critical: false, expectedDepth: null });
  await publishTemplate(template.id);

  const [candidate] = await db
    .insert(candidates)
    .values({ name: `Test Candidate ${randomUUID()}` })
    .returning();
  await startInterviewSession(candidate.id, template.id);

  return db.query.interviewTemplates.findFirst({ where: eq(interviewTemplates.id, template.id) });
}

// Plan Phase 23/§44.4 — Position -> InterviewTemplate is CASCADE at the DB
// level, made safe by InterviewTemplate -> InterviewSession's own RESTRICT;
// this domain-layer pre-check surfaces that as a friendly message before
// the DB would refuse the cascade anyway (§44.3/§44.5).
describe("deletePosition / archivePosition / restorePosition", () => {
  it("deletes a position with no templates at all", async () => {
    const position = await createTestPosition();
    await deletePosition(position.id);
    const reloaded = await db.query.positions.findFirst({ where: (p, { eq: eqOp }) => eqOp(p.id, position.id) });
    expect(reloaded).toBeUndefined();
  });

  it("deletes a position whose templates are unused drafts, cascading their content", async () => {
    const position = await createTestPosition();
    const [template] = await db
      .insert(interviewTemplates)
      .values({ positionId: position.id, stage: "technical", name: "Draft Template" })
      .returning();

    await deletePosition(position.id);

    const reloadedPosition = await db.query.positions.findFirst({
      where: (p, { eq: eqOp }) => eqOp(p.id, position.id),
    });
    expect(reloadedPosition).toBeUndefined();
    const reloadedTemplate = await db.query.interviewTemplates.findFirst({
      where: eq(interviewTemplates.id, template.id),
    });
    expect(reloadedTemplate).toBeUndefined();
  });

  it("refuses to delete a position with a locked (used) template", async () => {
    const position = await createTestPosition();
    await createLockedTemplateForPosition(position.id);

    await expect(deletePosition(position.id)).rejects.toThrow(/cannot be permanently deleted/);

    const reloaded = await db.query.positions.findFirst({ where: (p, { eq: eqOp }) => eqOp(p.id, position.id) });
    expect(reloaded).toBeDefined();
  });

  it("archives and restores a position", async () => {
    const position = await createTestPosition();
    await archivePosition(position.id);
    const afterArchive = await db.query.positions.findFirst({
      where: (p, { eq: eqOp }) => eqOp(p.id, position.id),
    });
    expect(afterArchive?.archivedAt).not.toBeNull();

    await restorePosition(position.id);
    const afterRestore = await db.query.positions.findFirst({
      where: (p, { eq: eqOp }) => eqOp(p.id, position.id),
    });
    expect(afterRestore?.archivedAt).toBeNull();
  });
});
