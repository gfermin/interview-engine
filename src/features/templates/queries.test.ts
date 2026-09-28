// @vitest-environment node
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { interviewTemplates, positions } from "@/db/schema";
import { candidates } from "@/db/schema";
import { startInterviewSession } from "@/features/candidates/mutations";
import { createCompetency, publishTemplate } from "./mutations";
import { hasSessionsForTemplate, listDraftTemplates, listPublishedTemplates, listTemplates } from "./queries";

async function createTemplateFixture(
  overrides: {
    status?: "draft" | "approved";
    archivedAt?: Date | null;
    positionArchivedAt?: Date | null;
  } = {}
) {
  const [position] = await db
    .insert(positions)
    .values({ title: `Position ${randomUUID()}`, archivedAt: overrides.positionArchivedAt ?? null })
    .returning();
  const [template] = await db
    .insert(interviewTemplates)
    .values({
      positionId: position.id,
      stage: "technical",
      name: "Test Template",
      archivedAt: overrides.archivedAt ?? null,
    })
    .returning();

  if (overrides.status === "approved") {
    await createCompetency(template.id, { name: "Programming", weight: 100, critical: false, expectedDepth: null });
    await publishTemplate(template.id);
  }

  return db.query.interviewTemplates.findFirst({ where: (t, { eq }) => eq(t.id, template.id) });
}

// Plan Phase 23/§44.9 — archived templates must never clutter the default
// Templates list or the "Start Interview Session" picker, but must remain
// reachable via an explicit filter on the list.
describe("listTemplates archived filter", () => {
  it("defaults to excluding archived templates", async () => {
    const active = await createTemplateFixture();
    const archived = await createTemplateFixture({ archivedAt: new Date() });

    const ids = (await listTemplates()).map((t) => t.id);

    expect(ids).toContain(active!.id);
    expect(ids).not.toContain(archived!.id);
  });

  it('archived: "all" returns both', async () => {
    const active = await createTemplateFixture();
    const archived = await createTemplateFixture({ archivedAt: new Date() });

    const ids = (await listTemplates({ archived: "all" })).map((t) => t.id);

    expect(ids).toContain(active!.id);
    expect(ids).toContain(archived!.id);
  });
});

describe("listPublishedTemplates", () => {
  it("excludes an archived-but-approved template unconditionally", async () => {
    const archived = await createTemplateFixture({ status: "approved", archivedAt: new Date() });
    const active = await createTemplateFixture({ status: "approved" });

    const ids = (await listPublishedTemplates()).map((t) => t.id);

    expect(ids).toContain(active!.id);
    expect(ids).not.toContain(archived!.id);
  });

  // AUDIT-007/Phase 26 — archiving a Position must also hide its (still
  // active) published Templates from the Dashboard, not just templates
  // archived directly.
  it("excludes a template whose Position is archived, even though the template itself isn't", async () => {
    const orphaned = await createTemplateFixture({ status: "approved", positionArchivedAt: new Date() });
    const active = await createTemplateFixture({ status: "approved" });

    const ids = (await listPublishedTemplates()).map((t) => t.id);

    expect(ids).toContain(active!.id);
    expect(ids).not.toContain(orphaned!.id);

    await db.update(positions).set({ archivedAt: null }).where(eq(positions.id, orphaned!.positionId));
    const idsAfterRestore = (await listPublishedTemplates()).map((t) => t.id);
    expect(idsAfterRestore).toContain(orphaned!.id);
  });
});

describe("listDraftTemplates", () => {
  it("excludes an archived draft unconditionally", async () => {
    const archived = await createTemplateFixture({ archivedAt: new Date() });
    const active = await createTemplateFixture();

    const ids = (await listDraftTemplates()).map((t) => t.id);

    expect(ids).toContain(active!.id);
    expect(ids).not.toContain(archived!.id);
  });

  // AUDIT-007/Phase 26 — same leak as listPublishedTemplates, for drafts.
  it("excludes a draft whose Position is archived, even though the draft itself isn't", async () => {
    const orphaned = await createTemplateFixture({ positionArchivedAt: new Date() });
    const active = await createTemplateFixture();

    const ids = (await listDraftTemplates()).map((t) => t.id);

    expect(ids).toContain(active!.id);
    expect(ids).not.toContain(orphaned!.id);
  });
});

// Plan Phase 23/§44.4/§44.5 — this is the ground-truth check deleteTemplate
// (mutations.ts) and the Template detail page both call; it must reflect
// actual Session existence, not the template's own `status` field (a real
// bug found in testing: `status` only flips to `locked` via a second,
// non-atomic write in `startInterviewSession`).
describe("hasSessionsForTemplate", () => {
  it("is false for a template with no sessions", async () => {
    const template = await createTemplateFixture({ status: "approved" });
    expect(await hasSessionsForTemplate(template!.id)).toBe(false);
  });

  it("is true once a session has been started against it", async () => {
    const template = await createTemplateFixture({ status: "approved" });
    const [candidate] = await db.insert(candidates).values({ name: `Candidate ${randomUUID()}` }).returning();
    await startInterviewSession(candidate.id, template!.id);

    expect(await hasSessionsForTemplate(template!.id)).toBe(true);
  });
});
