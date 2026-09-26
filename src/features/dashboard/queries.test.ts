// @vitest-environment node
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { candidates, interviewSessions, interviewTemplates, positions } from "@/db/schema";
import { getAttentionItems, getDashboardCounts, getRecentSessions } from "./queries";

async function createSessionFixture(
  overrides: {
    status?: "in_progress" | "completed" | "decided";
    templateStatus?: "draft" | "approved" | "locked";
    createdAt?: Date;
    archivedAt?: Date | null;
  } = {}
) {
  const [position] = await db
    .insert(positions)
    .values({ title: `Position ${randomUUID()}` })
    .returning();
  const [template] = await db
    .insert(interviewTemplates)
    .values({
      positionId: position.id,
      stage: "technical",
      name: "Test Template",
      status: overrides.templateStatus ?? "draft",
    })
    .returning();
  const [candidate] = await db
    .insert(candidates)
    .values({ name: `Candidate ${randomUUID()}` })
    .returning();
  const [session] = await db
    .insert(interviewSessions)
    .values({
      candidateId: candidate.id,
      templateId: template.id,
      status: overrides.status ?? "in_progress",
      archivedAt: overrides.archivedAt ?? null,
      ...(overrides.createdAt ? { createdAt: overrides.createdAt } : {}),
    })
    .returning();
  return { position, template, candidate, session };
}

describe("getDashboardCounts", () => {
  // Other test files share this same SQLite file and run in parallel workers
  // (the established pattern in queries.test.ts's own listSessions tests),
  // so counts can only be asserted as "at least" a delta, never an exact
  // before/after difference — a concurrent fixture from another file could
  // otherwise flake this test without any real bug present.
  it("counts a freshly created session under Today and its status bucket", async () => {
    const before = await getDashboardCounts();
    await createSessionFixture({ status: "in_progress" });
    const after = await getDashboardCounts();

    expect(after.interviewsToday).toBeGreaterThanOrEqual(before.interviewsToday + 1);
    expect(after.inProgress).toBeGreaterThanOrEqual(before.inProgress + 1);
  });

  it("counts 'completed' as Awaiting Decision and 'decided' as Completed separately", async () => {
    const before = await getDashboardCounts();
    await createSessionFixture({ status: "completed" });
    await createSessionFixture({ status: "decided" });
    const after = await getDashboardCounts();

    expect(after.awaitingDecision).toBeGreaterThanOrEqual(before.awaitingDecision + 1);
    expect(after.completed).toBeGreaterThanOrEqual(before.completed + 1);
  });

});

// Plan Phase 23/§44.9 — an archived session is, by definition, no longer
// part of active work and must never surface in the Dashboard's recent-
// sessions list (a per-session existence check, not a count comparison —
// counts alone can't be asserted race-proof against concurrent fixtures
// from other test files sharing this same SQLite file, per this suite's
// own documented convention above).
describe("getRecentSessions (archived exclusion)", () => {
  it("excludes an archived session", async () => {
    const { session } = await createSessionFixture({ archivedAt: new Date() });

    const rows = await getRecentSessions(500);

    expect(rows.some((r) => r.id === session.id)).toBe(false);
  });
});

describe("getRecentSessions", () => {
  it("includes a freshly created session with its canonical calculated status", async () => {
    const { session } = await createSessionFixture();

    const rows = await getRecentSessions(50);
    const row = rows.find((r) => r.id === session.id);

    expect(row).toBeDefined();
    // No competencies exist on this bare fixture template, so the same
    // canonical calculation the live-rating/Summary screens use correctly
    // reports no evidence yet.
    expect(row!.calculatedStatus).toBe("NOT_EVALUATED");
    expect(row!.overall).toBeNull();
  });
});

describe("getAttentionItems", () => {
  it("flags a 'completed' session as awaiting a decision", async () => {
    const { session } = await createSessionFixture({ status: "completed" });

    const items = await getAttentionItems();

    expect(items.some((item) => item.kind === "awaiting_decision" && item.href.includes(session.id))).toBe(true);
  });

  it("flags a draft template", async () => {
    const { template } = await createSessionFixture({ templateStatus: "draft" });

    const items = await getAttentionItems();

    expect(items.some((item) => item.kind === "draft_template" && item.href.includes(template.id))).toBe(true);
  });

  it("does not flag an approved template as a draft", async () => {
    const { template } = await createSessionFixture({ templateStatus: "approved" });

    const items = await getAttentionItems();

    expect(items.some((item) => item.kind === "draft_template" && item.href.includes(template.id))).toBe(false);
  });

  it("flags an in-progress session older than the staleness threshold, but not a fresh one", async () => {
    const staleDate = new Date(Date.now() - 72 * 60 * 60 * 1000);
    const stale = await createSessionFixture({ status: "in_progress", createdAt: staleDate });
    const fresh = await createSessionFixture({ status: "in_progress" });

    const items = await getAttentionItems();

    expect(items.some((item) => item.kind === "stale_in_progress" && item.href.includes(stale.session.id))).toBe(
      true
    );
    expect(items.some((item) => item.kind === "stale_in_progress" && item.href.includes(fresh.session.id))).toBe(
      false
    );
  });
});
