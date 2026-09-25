// @vitest-environment node
import { randomUUID } from "node:crypto";
import { stat } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { candidates, interviewSessions, interviewTemplates, positions } from "@/db/schema";
import { createCompetency, createMandatoryRequirement, createQuestion } from "@/features/templates/mutations";
import {
  rateQuestion,
  recordDecision,
  reopenSession,
  updateMandatoryRequirementStatus,
} from "@/features/interviews/mutations";
import { generateReport } from "./mutations";
import { getReport, listReportsForSession } from "./queries";

async function createDecidedSessionFixture() {
  const [position] = await db
    .insert(positions)
    .values({ title: `Test Position ${randomUUID()}`, seniority: "Senior" })
    .returning();
  const [template] = await db
    .insert(interviewTemplates)
    .values({ positionId: position.id, stage: "technical", name: "Test Template" })
    .returning();
  const competency = await createCompetency(template.id, {
    name: "Programming",
    weight: 100,
    critical: true,
    expectedDepth: "Explains WHY, not just HOW.",
  });
  const question = await createQuestion(template.id, {
    competencyId: competency.id,
    text: "How do you debug a flaky test?",
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
  });
  const requirement = await createMandatoryRequirement(template.id, {
    label: "Work authorization",
    description: null,
  });
  const [candidate] = await db
    .insert(candidates)
    .values({ name: `Test Candidate ${randomUUID()}`, email: "candidate@example.com" })
    .returning();
  const [session] = await db
    .insert(interviewSessions)
    .values({ candidateId: candidate.id, templateId: template.id })
    .returning();

  await rateQuestion(session.id, question.id, 5);
  await updateMandatoryRequirementStatus(session.id, requirement.id, "met");
  await recordDecision(session.id, { mode: "accept" });

  return { session, question };
}

describe("generateReport", () => {
  it("refuses to generate a report before a decision is recorded", async () => {
    const [position] = await db
      .insert(positions)
      .values({ title: `Test Position ${randomUUID()}` })
      .returning();
    const [template] = await db
      .insert(interviewTemplates)
      .values({ positionId: position.id, stage: "technical", name: "Test Template" })
      .returning();
    const [candidate] = await db
      .insert(candidates)
      .values({ name: `Test Candidate ${randomUUID()}` })
      .returning();
    const [session] = await db
      .insert(interviewSessions)
      .values({ candidateId: candidate.id, templateId: template.id })
      .returning();

    await expect(generateReport(session.id)).rejects.toThrow(/recorded decision/);
  });

  it("renders a real, non-empty PDF and persists an InterviewReport row pointing at it", async () => {
    const { session } = await createDecidedSessionFixture();

    const report = await generateReport(session.id);

    expect(report.sessionId).toBe(session.id);
    expect(report.fileSize).toBeGreaterThan(0);

    const fileStat = await stat(report.filePath);
    expect(fileStat.size).toBe(report.fileSize);
    expect(fileStat.size).toBeGreaterThan(0);

    const persisted = await getReport(report.id);
    expect(persisted?.filePath).toBe(report.filePath);
  }, 20000);

  it("generating twice produces two distinct report records (no overwrite)", async () => {
    const { session } = await createDecidedSessionFixture();

    const first = await generateReport(session.id);
    const second = await generateReport(session.id);

    expect(first.id).not.toBe(second.id);
    expect(first.filePath).not.toBe(second.filePath);

    const reports = await listReportsForSession(session.id);
    expect(reports).toHaveLength(2);
  }, 30000);

  it("throws when the session doesn't exist", async () => {
    await expect(generateReport(randomUUID())).rejects.toThrow(/not found/);
  });

  // Plan §11/Phase 11's testing requirement: finalize, reopen, re-rate,
  // re-finalize, confirm two distinct InterviewReport records exist.
  it("a full finalize -> reopen -> re-rate -> re-finalize cycle produces a second, distinct report", async () => {
    const { session, question } = await createDecidedSessionFixture();

    const firstReport = await generateReport(session.id);

    await reopenSession(session.id);
    await rateQuestion(session.id, question.id, 1); // was 5 -> now fails the critical bar
    await recordDecision(session.id, {
      mode: "accept",
    });

    const secondReport = await generateReport(session.id);

    expect(secondReport.id).not.toBe(firstReport.id);
    expect(secondReport.filePath).not.toBe(firstReport.filePath);

    const reports = await listReportsForSession(session.id);
    expect(reports).toHaveLength(2);

    const finalDecision = await db.query.interviewDecisions.findFirst({
      where: (t, { eq: eqOp }) => eqOp(t.sessionId, session.id),
    });
    expect(finalDecision?.finalDecision).toBe("FAIL");
  }, 30000);
});
