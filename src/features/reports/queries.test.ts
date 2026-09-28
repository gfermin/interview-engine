// @vitest-environment node
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import {
  candidates,
  interviewDecisions,
  interviewReports,
  interviewSessions,
  interviewTemplates,
  positions,
} from "@/db/schema";
import { createCompetency, createQuestion } from "@/features/templates/mutations";
import { rateQuestion, recordDecision, reopenSession } from "@/features/interviews/mutations";
import { listAllReports } from "./queries";

async function createReportFixture(overrides: {
  candidateName?: string;
  positionTitle?: string;
  stage?: "technical" | "screening";
  createdAt?: Date;
  displayName?: string | null;
} = {}) {
  const [position] = await db
    .insert(positions)
    .values({ title: overrides.positionTitle ?? `Position ${randomUUID()}` })
    .returning();
  const [template] = await db
    .insert(interviewTemplates)
    .values({ positionId: position.id, stage: overrides.stage ?? "technical", name: "Test Template" })
    .returning();
  const [candidate] = await db
    .insert(candidates)
    .values({ name: overrides.candidateName ?? `Candidate ${randomUUID()}` })
    .returning();
  const [session] = await db
    .insert(interviewSessions)
    .values({ candidateId: candidate.id, templateId: template.id, status: "decided" })
    .returning();
  await db.insert(interviewDecisions).values({
    sessionId: session.id,
    calculatedStatus: "PASS",
    calculatedReason: "Meets the bar.",
    calculatedRecommendation: "PASS",
    mode: "accept",
    finalDecision: "PASS",
  });
  const reportId = randomUUID();
  const [report] = await db
    .insert(interviewReports)
    .values({
      id: reportId,
      sessionId: session.id,
      filePath: `.data/reports/${reportId}.pdf`,
      fileSize: 1024,
      displayName: overrides.displayName === undefined ? `Fixture Display Name ${randomUUID()}` : overrides.displayName,
      fileName: `${reportId}.pdf`,
      ...(overrides.createdAt ? { createdAt: overrides.createdAt } : {}),
    })
    .returning();
  return { position, template, candidate, session, report };
}

describe("listAllReports", () => {
  it("returns every report when no filters are given", async () => {
    const a = await createReportFixture();
    const b = await createReportFixture();

    const ids = (await listAllReports()).map((r) => r.id);

    expect(ids).toContain(a.report.id);
    expect(ids).toContain(b.report.id);
  });

  it("returns an empty array when no reports exist matching an impossible filter", async () => {
    const results = await listAllReports({ search: `no-such-candidate-${randomUUID()}` });
    expect(results).toEqual([]);
  });

  it("search matches candidate name", async () => {
    const marker = randomUUID();
    const match = await createReportFixture({ candidateName: `Jane ${marker} Doe` });
    const nonMatch = await createReportFixture();

    const ids = (await listAllReports({ search: marker })).map((r) => r.id);

    expect(ids).toContain(match.report.id);
    expect(ids).not.toContain(nonMatch.report.id);
  });

  it("search matches position title", async () => {
    const marker = randomUUID();
    const match = await createReportFixture({ positionTitle: `Senior Engineer ${marker}` });
    const nonMatch = await createReportFixture();

    const ids = (await listAllReports({ search: marker })).map((r) => r.id);

    expect(ids).toContain(match.report.id);
    expect(ids).not.toContain(nonMatch.report.id);
  });

  it("filters by stage", async () => {
    const technical = await createReportFixture({ stage: "technical" });
    const screening = await createReportFixture({ stage: "screening" });

    const ids = (await listAllReports({ stage: "screening" })).map((r) => r.id);

    expect(ids).toContain(screening.report.id);
    expect(ids).not.toContain(technical.report.id);
  });

  it("sorts newest first", async () => {
    const older = await createReportFixture({ createdAt: new Date("2020-01-01T00:00:00Z") });
    const newer = await createReportFixture({ createdAt: new Date("2026-01-01T00:00:00Z") });

    const results = await listAllReports();
    const olderIndex = results.findIndex((r) => r.id === older.report.id);
    const newerIndex = results.findIndex((r) => r.id === newer.report.id);

    expect(newerIndex).toBeLessThan(olderIndex);
  });

  it("uses the stored displayName when present", async () => {
    const fixture = await createReportFixture({ displayName: "Stored Name — Position — Stage" });

    const results = await listAllReports();
    const entry = results.find((r) => r.id === fixture.report.id);

    expect(entry?.displayName).toBe("Stored Name — Position — Stage");
  });

  it("falls back to a computed displayName when the column is null (pre-migration rows)", async () => {
    const marker = randomUUID();
    const fixture = await createReportFixture({
      candidateName: `Legacy Candidate ${marker}`,
      positionTitle: "Backend Developer",
      displayName: null,
    });

    const results = await listAllReports();
    const entry = results.find((r) => r.id === fixture.report.id);

    expect(entry?.displayName).toBe(`Legacy Candidate ${marker} — Backend Developer — Technical Interview`);
  });

  it("multiple candidates produce distinguishable entries", async () => {
    const a = await createReportFixture({ candidateName: `Alice ${randomUUID()}` });
    const b = await createReportFixture({ candidateName: `Bob ${randomUUID()}` });

    const results = await listAllReports();
    const entryA = results.find((r) => r.id === a.report.id);
    const entryB = results.find((r) => r.id === b.report.id);

    expect(entryA?.candidateName).not.toBe(entryB?.candidateName);
    expect(entryA?.displayName).not.toBe(entryB?.displayName);
  });

  it("includes calculated status and final decision from the joined decision", async () => {
    const fixture = await createReportFixture();

    const results = await listAllReports();
    const entry = results.find((r) => r.id === fixture.report.id);

    expect(entry?.calculatedStatus).toBe("PASS");
    expect(entry?.finalDecision).toBe("PASS");
    expect(entry?.statusLabel).toBe("Pass");
  });

  // AUDIT-005/AUDIT-006/Phase 29 — `overall` must come from the decision's
  // own persisted snapshot, not a live recompute, so it can never visually
  // contradict the decision badge shown on the same row.
  it("reads overall from the decision row's persisted snapshot, not a recompute", async () => {
    const fixture = await createReportFixture();
    await db
      .update(interviewDecisions)
      .set({ overall: 87.5 })
      .where(eq(interviewDecisions.sessionId, fixture.session.id));

    const results = await listAllReports();
    const entry = results.find((r) => r.id === fixture.report.id);

    expect(entry?.overall).toBe(87.5);
  });

  it("a decision recorded before the overall/completion columns existed reports overall as null, not an error", async () => {
    const fixture = await createReportFixture();
    // Simulates a pre-migration row: overall/completion are nullable and
    // default to null on any row that predates this column's existence.

    const results = await listAllReports();
    const entry = results.find((r) => r.id === fixture.report.id);

    expect(entry?.overall).toBeNull();
  });

  it("still shows the last-decided overall after a Reopen changes a rating without a new decision being recorded", async () => {
    const [position] = await db
      .insert(positions)
      .values({ title: `Position ${randomUUID()}` })
      .returning();
    const [template] = await db
      .insert(interviewTemplates)
      .values({ positionId: position.id, stage: "technical", name: "Test Template" })
      .returning();
    const competency = await createCompetency(template.id, {
      name: "Programming",
      weight: 100,
      critical: false,
      expectedDepth: null,
    });
    const question = await createQuestion(template.id, {
      competencyId: competency.id,
      text: "Explain a design pattern.",
      difficulty: "medium",
      importance: "core",
      expected: null,
      strong: null,
      acceptable: null,
      concepts: [],
      redFlags: [],
      followUps: [],
      rubric: [],
      code: null,
      solution: null,
      jdRequirementTag: null,
      altSolutions: null,
      requiresTechnicalKnowledge: false,
      technicalTermHelper: null,
    });
    const [candidate] = await db
      .insert(candidates)
      .values({ name: `Candidate ${randomUUID()}` })
      .returning();
    const [session] = await db
      .insert(interviewSessions)
      .values({ candidateId: candidate.id, templateId: template.id })
      .returning();

    await rateQuestion(session.id, question.id, 5);
    await recordDecision(session.id, { mode: "accept" });
    const decidedResults = await listAllReports();
    // No report row exists yet for this session — listAllReports only
    // shows sessions with a generated InterviewReport — so insert one
    // directly, matching createReportFixture's shape.
    const reportId = randomUUID();
    await db.insert(interviewReports).values({
      id: reportId,
      sessionId: session.id,
      filePath: `.data/reports/${reportId}.pdf`,
      fileSize: 1024,
      displayName: `Fixture Display Name ${randomUUID()}`,
      fileName: `${reportId}.pdf`,
    });
    const beforeDrift = (await listAllReports()).find((r) => r.id === reportId);
    expect(decidedResults).toBeDefined();

    await reopenSession(session.id);
    await rateQuestion(session.id, question.id, 0); // drift: was 5, now 0 — no re-decide follows

    const afterDrift = (await listAllReports()).find((r) => r.id === reportId);

    expect(afterDrift?.overall).toBe(beforeDrift?.overall);
    expect(afterDrift?.calculatedStatus).toBe(beforeDrift?.calculatedStatus);
  });
});
