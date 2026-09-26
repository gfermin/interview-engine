// @vitest-environment node
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { candidates, interviewTemplates, positions } from "@/db/schema";
import { startInterviewSession } from "@/features/candidates/mutations";
import { createCompetency, publishTemplate } from "@/features/templates/mutations";
import { countUsedTemplatesForPosition, listPositions } from "./queries";

async function createPositionFixture(archivedAt: Date | null = null) {
  const [position] = await db
    .insert(positions)
    .values({ title: `Position ${randomUUID()}`, archivedAt })
    .returning();
  return position;
}

// Plan Phase 23/§44.9 — archived positions must never clutter the default
// list, position pickers (Template/Candidate creation), or Dashboard, but
// must remain reachable via an explicit filter.
describe("listPositions archived filter", () => {
  it("defaults to excluding archived positions", async () => {
    const active = await createPositionFixture();
    const archived = await createPositionFixture(new Date());

    const ids = (await listPositions()).map((p) => p.id);

    expect(ids).toContain(active.id);
    expect(ids).not.toContain(archived.id);
  });

  it('archived: "archived" returns only archived positions', async () => {
    const active = await createPositionFixture();
    const archived = await createPositionFixture(new Date());

    const ids = (await listPositions({ archived: "archived" })).map((p) => p.id);

    expect(ids).toContain(archived.id);
    expect(ids).not.toContain(active.id);
  });

  it('archived: "all" returns both', async () => {
    const active = await createPositionFixture();
    const archived = await createPositionFixture(new Date());

    const ids = (await listPositions({ archived: "all" })).map((p) => p.id);

    expect(ids).toContain(active.id);
    expect(ids).toContain(archived.id);
  });
});

// Plan Phase 23/§44.4/§44.5 — this is the ground-truth check deletePosition
// (mutations.ts) and the Position detail page both call; it must reflect
// actual Session existence across every template the position owns, not
// each template's own `status` field (a real bug found in testing).
describe("countUsedTemplatesForPosition", () => {
  it("is 0 for a position with no templates, or only unused ones", async () => {
    const position = await createPositionFixture();
    await db
      .insert(interviewTemplates)
      .values({ positionId: position.id, stage: "technical", name: "Unused Draft" });

    expect(await countUsedTemplatesForPosition(position.id)).toBe(0);
  });

  it("counts a template once it has a session, and a second session against it doesn't double-count", async () => {
    const position = await createPositionFixture();
    const [template] = await db
      .insert(interviewTemplates)
      .values({ positionId: position.id, stage: "technical", name: "Test Template" })
      .returning();
    await createCompetency(template.id, { name: "Programming", weight: 100, critical: false, expectedDepth: null });
    await publishTemplate(template.id);

    const [candidateA] = await db.insert(candidates).values({ name: `Candidate ${randomUUID()}` }).returning();
    await startInterviewSession(candidateA.id, template.id);
    expect(await countUsedTemplatesForPosition(position.id)).toBe(1);

    const [candidateB] = await db.insert(candidates).values({ name: `Candidate ${randomUUID()}` }).returning();
    await startInterviewSession(candidateB.id, template.id);
    expect(await countUsedTemplatesForPosition(position.id)).toBe(1);
  });
});
