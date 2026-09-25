// @vitest-environment node
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { candidates, interviewSessions, interviewTemplates, positions } from "@/db/schema";
import { listSessions } from "./queries";

async function createSessionFixture(
  overrides: {
    stage?: "technical" | "screening";
    status?: "in_progress" | "completed" | "decided";
  } = {}
) {
  const [position] = await db
    .insert(positions)
    .values({ title: `Position ${randomUUID()}` })
    .returning();
  const [template] = await db
    .insert(interviewTemplates)
    .values({ positionId: position.id, stage: overrides.stage ?? "technical", name: "Test Template" })
    .returning();
  const [candidate] = await db
    .insert(candidates)
    .values({ name: `Candidate ${randomUUID()}` })
    .returning();
  const [session] = await db
    .insert(interviewSessions)
    .values({ candidateId: candidate.id, templateId: template.id, status: overrides.status ?? "in_progress" })
    .returning();
  return { position, template, candidate, session };
}

// §40.5 item 4: the interview history list's position/candidate/stage/
// status filter combinations had no test coverage.
describe("listSessions", () => {
  it("returns every session when no filters are given", async () => {
    const a = await createSessionFixture();
    const b = await createSessionFixture();

    const ids = (await listSessions()).map((r) => r.id);

    expect(ids).toContain(a.session.id);
    expect(ids).toContain(b.session.id);
  });

  it("filters by positionId", async () => {
    const a = await createSessionFixture();
    const b = await createSessionFixture();

    const ids = (await listSessions({ positionId: a.position.id })).map((r) => r.id);

    expect(ids).toContain(a.session.id);
    expect(ids).not.toContain(b.session.id);
  });

  it("filters by candidateId", async () => {
    const a = await createSessionFixture();
    const b = await createSessionFixture();

    const ids = (await listSessions({ candidateId: a.candidate.id })).map((r) => r.id);

    expect(ids).toContain(a.session.id);
    expect(ids).not.toContain(b.session.id);
  });

  it("filters by stage", async () => {
    const technical = await createSessionFixture({ stage: "technical" });
    const screening = await createSessionFixture({ stage: "screening" });

    const ids = (await listSessions({ stage: "screening" })).map((r) => r.id);

    expect(ids).toContain(screening.session.id);
    expect(ids).not.toContain(technical.session.id);
  });

  it("filters by status", async () => {
    const inProgress = await createSessionFixture({ status: "in_progress" });
    const decided = await createSessionFixture({ status: "decided" });

    const ids = (await listSessions({ status: "decided" })).map((r) => r.id);

    expect(ids).toContain(decided.session.id);
    expect(ids).not.toContain(inProgress.session.id);
  });

  it("combines filters with AND semantics, not OR", async () => {
    const match = await createSessionFixture({ stage: "screening", status: "completed" });
    const wrongStage = await createSessionFixture({ stage: "technical", status: "completed" });
    const wrongStatus = await createSessionFixture({ stage: "screening", status: "in_progress" });

    const ids = (await listSessions({ stage: "screening", status: "completed" })).map((r) => r.id);

    expect(ids).toContain(match.session.id);
    expect(ids).not.toContain(wrongStage.session.id);
    expect(ids).not.toContain(wrongStatus.session.id);
  });

  it("an unmatched filter combination returns an empty list, not every session", async () => {
    await createSessionFixture({ stage: "technical" });
    const results = await listSessions({ positionId: randomUUID() });
    expect(results).toEqual([]);
  });
});
