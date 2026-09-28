// @vitest-environment node
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { candidates, interviewSessions, interviewTemplates, positions } from "@/db/schema";
import { getSessionDetail, listSessions } from "./queries";

async function createSessionFixture(
  overrides: {
    stage?: "technical" | "screening";
    status?: "in_progress" | "completed" | "decided";
    archivedAt?: Date | null;
    candidateArchivedAt?: Date | null;
    positionArchivedAt?: Date | null;
  } = {}
) {
  const [position] = await db
    .insert(positions)
    .values({ title: `Position ${randomUUID()}`, archivedAt: overrides.positionArchivedAt ?? null })
    .returning();
  const [template] = await db
    .insert(interviewTemplates)
    .values({ positionId: position.id, stage: overrides.stage ?? "technical", name: "Test Template" })
    .returning();
  const [candidate] = await db
    .insert(candidates)
    .values({ name: `Candidate ${randomUUID()}`, archivedAt: overrides.candidateArchivedAt ?? null })
    .returning();
  const [session] = await db
    .insert(interviewSessions)
    .values({
      candidateId: candidate.id,
      templateId: template.id,
      status: overrides.status ?? "in_progress",
      archivedAt: overrides.archivedAt ?? null,
    })
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

  // Plan Phase 23/§44.9 — archived sessions must never clutter the default
  // Interview History list/Dashboard, but must remain reachable via an
  // explicit filter.
  describe("archived filter", () => {
    it("defaults to excluding archived sessions", async () => {
      const active = await createSessionFixture();
      const archived = await createSessionFixture({ archivedAt: new Date() });

      const ids = (await listSessions()).map((r) => r.id);

      expect(ids).toContain(active.session.id);
      expect(ids).not.toContain(archived.session.id);
    });

    it('archived: "archived" returns only archived sessions', async () => {
      const active = await createSessionFixture();
      const archived = await createSessionFixture({ archivedAt: new Date() });

      const ids = (await listSessions({ archived: "archived" })).map((r) => r.id);

      expect(ids).toContain(archived.session.id);
      expect(ids).not.toContain(active.session.id);
    });

    it('archived: "all" returns both', async () => {
      const active = await createSessionFixture();
      const archived = await createSessionFixture({ archivedAt: new Date() });

      const ids = (await listSessions({ archived: "all" })).map((r) => r.id);

      expect(ids).toContain(active.session.id);
      expect(ids).toContain(archived.session.id);
    });
  });

  // AUDIT-008/Phase 26 — a session whose own archivedAt is still null must
  // nonetheless disappear once its Candidate or Position is archived.
  describe("archival leakage through parent entities", () => {
    it("excludes a session whose Candidate is archived", async () => {
      const orphaned = await createSessionFixture({ candidateArchivedAt: new Date() });
      const active = await createSessionFixture();

      const ids = (await listSessions()).map((r) => r.id);

      expect(ids).toContain(active.session.id);
      expect(ids).not.toContain(orphaned.session.id);
    });

    it("excludes a session whose Position is archived", async () => {
      const orphaned = await createSessionFixture({ positionArchivedAt: new Date() });
      const active = await createSessionFixture();

      const ids = (await listSessions()).map((r) => r.id);

      expect(ids).toContain(active.session.id);
      expect(ids).not.toContain(orphaned.session.id);
    });

    it("a restored Candidate makes its session reappear", async () => {
      const { session, candidate } = await createSessionFixture({ candidateArchivedAt: new Date() });
      expect((await listSessions()).map((r) => r.id)).not.toContain(session.id);

      await db.update(candidates).set({ archivedAt: null }).where(eq(candidates.id, candidate.id));

      expect((await listSessions()).map((r) => r.id)).toContain(session.id);
    });
  });
});

// AUDIT-011/Phase 27 — the live-interview/summary headers need the
// session's own creation date; getSessionDetail didn't select it at all.
describe("getSessionDetail", () => {
  it("includes the session's own createdAt", async () => {
    const { session } = await createSessionFixture();

    const detail = await getSessionDetail(session.id);

    expect(detail?.createdAt).toBeInstanceOf(Date);
    expect(detail?.createdAt.getTime()).toBe(session.createdAt.getTime());
  });
});
