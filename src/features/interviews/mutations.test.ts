// @vitest-environment node
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import {
  candidates,
  competencyEvaluations,
  interviewSessions,
  interviewTemplates,
  positions,
  questionEvaluations,
  supplementaryAssessments,
} from "@/db/schema";
import { createCompetency, createMandatoryRequirement, createQuestion } from "@/features/templates/mutations";
import {
  finishRating,
  rateQuestion,
  recordDecision,
  updateEnglishAssessment,
  updateMandatoryRequirementStatus,
  updateQuestionNotes,
} from "./mutations";

async function createFixture(overrides: { passThreshold?: number; borderlineMin?: number } = {}) {
  const [position] = await db
    .insert(positions)
    .values({ title: `Test Position ${randomUUID()}` })
    .returning();
  const [template] = await db
    .insert(interviewTemplates)
    .values({
      positionId: position.id,
      stage: "technical",
      name: "Test Template",
      passThreshold: overrides.passThreshold ?? 70,
      borderlineMin: overrides.borderlineMin ?? 50,
    })
    .returning();
  const competency = await createCompetency(template.id, {
    name: "Programming",
    weight: 100,
    critical: true,
    expectedDepth: null,
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
  });
  const secondQuestion = await createQuestion(template.id, {
    competencyId: competency.id,
    text: "Explain a debugging exercise.",
    difficulty: "easy",
    importance: "secondary",
    expected: null,
    strong: null,
    acceptable: null,
    concepts: [],
    redFlags: [],
    followUps: [],
    rubric: [],
    code: null,
    solution: null,
  });
  const requirement = await createMandatoryRequirement(template.id, {
    label: "Work authorization",
    description: null,
  });
  const [candidate] = await db
    .insert(candidates)
    .values({ name: `Test Candidate ${randomUUID()}` })
    .returning();
  const [session] = await db
    .insert(interviewSessions)
    .values({ candidateId: candidate.id, templateId: template.id })
    .returning();

  return { template, competency, question, secondQuestion, requirement, session };
}

/** Rates both of the fixture's questions high enough, and marks the
 * mandatory requirement met, to reach a calculated PASS — the common setup
 * several decision tests build on. */
async function bringSessionToPass(fixture: Awaited<ReturnType<typeof createFixture>>) {
  await rateQuestion(fixture.session.id, fixture.question.id, 5);
  await rateQuestion(fixture.session.id, fixture.secondQuestion.id, 5);
  await updateMandatoryRequirementStatus(fixture.session.id, fixture.requirement.id, "met");
}

describe("rateQuestion", () => {
  it("persists a numeric score and recomputes the competency rollup", async () => {
    const { competency, question, session } = await createFixture();

    await rateQuestion(session.id, question.id, 4);

    const evaluation = await db.query.questionEvaluations.findFirst({
      where: and(
        eq(questionEvaluations.sessionId, session.id),
        eq(questionEvaluations.questionId, question.id)
      ),
    });
    expect(evaluation?.score).toBe(4);
    expect(evaluation?.isNa).toBe(false);

    const rollup = await db.query.competencyEvaluations.findFirst({
      where: and(
        eq(competencyEvaluations.sessionId, session.id),
        eq(competencyEvaluations.competencyId, competency.id)
      ),
    });
    // Only one of the competency's two questions is rated so far.
    expect(rollup?.evaluated).toBe(1);
    expect(rollup?.percent).toBe(80);
  });

  it("re-rating the same question updates in place rather than duplicating the row", async () => {
    const { question, session } = await createFixture();

    await rateQuestion(session.id, question.id, 2);
    await rateQuestion(session.id, question.id, 5);

    const evaluations = await db.query.questionEvaluations.findMany({
      where: and(
        eq(questionEvaluations.sessionId, session.id),
        eq(questionEvaluations.questionId, question.id)
      ),
    });
    expect(evaluations).toHaveLength(1);
    expect(evaluations[0].score).toBe(5);
  });

  it("marking N/A stores isNa and excludes the question from evaluated/percent", async () => {
    const { competency, question, secondQuestion, session } = await createFixture();
    await rateQuestion(session.id, question.id, "na");
    await rateQuestion(session.id, secondQuestion.id, 3);

    const rollup = await db.query.competencyEvaluations.findFirst({
      where: and(
        eq(competencyEvaluations.sessionId, session.id),
        eq(competencyEvaluations.competencyId, competency.id)
      ),
    });
    expect(rollup?.na).toBe(1);
    expect(rollup?.evaluated).toBe(1);
    expect(rollup?.percent).toBe(60);
  });

  it("clearing a rating (null) resets it back to unrated", async () => {
    const { question, session } = await createFixture();
    await rateQuestion(session.id, question.id, 3);
    await rateQuestion(session.id, question.id, null);

    const evaluation = await db.query.questionEvaluations.findFirst({
      where: and(
        eq(questionEvaluations.sessionId, session.id),
        eq(questionEvaluations.questionId, question.id)
      ),
    });
    expect(evaluation?.score).toBeNull();
    expect(evaluation?.isNa).toBe(false);
  });

  it("throws when the question doesn't exist", async () => {
    const { session } = await createFixture();
    await expect(rateQuestion(session.id, randomUUID(), 3)).rejects.toThrow(/not found/);
  });
});

describe("updateQuestionNotes", () => {
  it("saves notes without affecting an existing rating", async () => {
    const { question, session } = await createFixture();
    await rateQuestion(session.id, question.id, 4);

    await updateQuestionNotes(session.id, question.id, "Strong root-cause reasoning.");

    const evaluation = await db.query.questionEvaluations.findFirst({
      where: and(
        eq(questionEvaluations.sessionId, session.id),
        eq(questionEvaluations.questionId, question.id)
      ),
    });
    expect(evaluation?.notes).toBe("Strong root-cause reasoning.");
    expect(evaluation?.score).toBe(4);
  });

  it("can save notes before any rating exists", async () => {
    const { question, session } = await createFixture();
    await updateQuestionNotes(session.id, question.id, "Came back to this later.");

    const evaluation = await db.query.questionEvaluations.findFirst({
      where: and(
        eq(questionEvaluations.sessionId, session.id),
        eq(questionEvaluations.questionId, question.id)
      ),
    });
    expect(evaluation?.notes).toBe("Came back to this later.");
    expect(evaluation?.score).toBeNull();
    expect(evaluation?.isNa).toBe(false);
  });
});

describe("updateMandatoryRequirementStatus", () => {
  it("persists a status and can be changed back to unknown", async () => {
    const { requirement, session } = await createFixture();

    await updateMandatoryRequirementStatus(session.id, requirement.id, "not_met");
    let row = await db.query.mandatoryRequirementEvaluations.findFirst({
      where: (t, { eq: eqOp }) => eqOp(t.sessionId, session.id),
    });
    expect(row?.status).toBe("not_met");

    await updateMandatoryRequirementStatus(session.id, requirement.id, "unknown");
    row = await db.query.mandatoryRequirementEvaluations.findFirst({
      where: (t, { eq: eqOp }) => eqOp(t.sessionId, session.id),
    });
    expect(row?.status).toBe("unknown");
  });
});

describe("updateEnglishAssessment", () => {
  it("persists a level and can be cleared back to null", async () => {
    const { session } = await createFixture();

    await updateEnglishAssessment(session.id, 4);
    let row = await db.query.supplementaryAssessments.findFirst({
      where: and(eq(supplementaryAssessments.sessionId, session.id), eq(supplementaryAssessments.kind, "english")),
    });
    expect(row?.level).toBe(4);

    await updateEnglishAssessment(session.id, null);
    row = await db.query.supplementaryAssessments.findFirst({
      where: and(eq(supplementaryAssessments.sessionId, session.id), eq(supplementaryAssessments.kind, "english")),
    });
    expect(row?.level).toBeNull();
  });
});

describe("finishRating", () => {
  it("moves an in_progress session to completed", async () => {
    const { session } = await createFixture();
    await finishRating(session.id);
    const updated = await db.query.interviewSessions.findFirst({ where: eq(interviewSessions.id, session.id) });
    expect(updated?.status).toBe("completed");
  });

  it("is a no-op once the session is already decided", async () => {
    const fixture = await createFixture();
    await bringSessionToPass(fixture);
    await recordDecision(fixture.session.id, { mode: "accept" });

    await finishRating(fixture.session.id);

    const updated = await db.query.interviewSessions.findFirst({
      where: eq(interviewSessions.id, fixture.session.id),
    });
    expect(updated?.status).toBe("decided");
  });
});

describe("recordDecision", () => {
  it("accepts a calculated PASS and marks the session decided", async () => {
    const fixture = await createFixture();
    await bringSessionToPass(fixture);

    const { result, finalDecision } = await recordDecision(fixture.session.id, { mode: "accept" });
    expect(result.status).toBe("PASS");
    expect(finalDecision).toBe("PASS");

    const decision = await db.query.interviewDecisions.findFirst({
      where: (t, { eq: eqOp }) => eqOp(t.sessionId, fixture.session.id),
    });
    expect(decision?.mode).toBe("accept");
    expect(decision?.finalDecision).toBe("PASS");
    expect(decision?.calculatedStatus).toBe("PASS");

    const session = await db.query.interviewSessions.findFirst({
      where: eq(interviewSessions.id, fixture.session.id),
    });
    expect(session?.status).toBe("decided");
  });

  it("overriding a calculated PASS flips it to FAIL and requires a reason", async () => {
    const fixture = await createFixture();
    await bringSessionToPass(fixture);

    await expect(recordDecision(fixture.session.id, { mode: "override" })).rejects.toThrow(/reason is required/i);

    const { finalDecision } = await recordDecision(fixture.session.id, {
      mode: "override",
      reason: "Candidate's answers didn't hold up under follow-up questioning.",
    });
    expect(finalDecision).toBe("FAIL");
  });

  it("a BORDERLINE result only accepts a forced_call with an explicit choice and a reason", async () => {
    const fixture = await createFixture({ passThreshold: 90, borderlineMin: 10 });
    await rateQuestion(fixture.session.id, fixture.question.id, 3); // 60%, between 10 and 90
    await rateQuestion(fixture.session.id, fixture.secondQuestion.id, 3);
    await updateMandatoryRequirementStatus(fixture.session.id, fixture.requirement.id, "met");

    await expect(recordDecision(fixture.session.id, { mode: "accept" })).rejects.toThrow(/isn't valid/);

    const { result, finalDecision } = await recordDecision(fixture.session.id, {
      mode: "forced_call",
      forcedChoice: "PASS",
      reason: "Strong debugging instincts despite an inconsistent score.",
    });
    expect(result.status).toBe("BORDERLINE");
    expect(finalDecision).toBe("PASS");
  });

  it("a failed mandatory requirement drives FAIL regardless of competency scores", async () => {
    const fixture = await createFixture();
    await rateQuestion(fixture.session.id, fixture.question.id, 5);
    await rateQuestion(fixture.session.id, fixture.secondQuestion.id, 5);
    await updateMandatoryRequirementStatus(fixture.session.id, fixture.requirement.id, "not_met");

    const { result } = await recordDecision(fixture.session.id, { mode: "accept" });
    expect(result.status).toBe("FAIL");
    expect(result.reason).toMatch(/Mandatory requirement/);
  });

  it("refuses to record a decision before the interview reaches a judged status", async () => {
    const fixture = await createFixture();
    // Nothing rated yet -> NOT_EVALUATED.
    await expect(recordDecision(fixture.session.id, { mode: "accept" })).rejects.toThrow(/isn't valid/);
  });

  it("changing a decision overwrites the prior one (no history kept, plan §21/§38)", async () => {
    const fixture = await createFixture();
    await bringSessionToPass(fixture);

    await recordDecision(fixture.session.id, { mode: "accept" });
    await recordDecision(fixture.session.id, {
      mode: "override",
      reason: "Reconsidered after a reference check.",
    });

    const decisions = await db.query.interviewDecisions.findMany({
      where: (t, { eq: eqOp }) => eqOp(t.sessionId, fixture.session.id),
    });
    expect(decisions).toHaveLength(1);
    expect(decisions[0].mode).toBe("override");
    expect(decisions[0].finalDecision).toBe("FAIL");
  });
});

describe("session editability guard", () => {
  it("refuses to rate a question once the session is decided", async () => {
    const fixture = await createFixture();
    await bringSessionToPass(fixture);
    await recordDecision(fixture.session.id, { mode: "accept" });

    await expect(rateQuestion(fixture.session.id, fixture.question.id, 2)).rejects.toThrow(/already been finished/);
  });

  it("refuses to update notes once the session is completed", async () => {
    const fixture = await createFixture();
    await finishRating(fixture.session.id);

    await expect(
      updateQuestionNotes(fixture.session.id, fixture.question.id, "too late")
    ).rejects.toThrow(/already been finished/);
  });
});
