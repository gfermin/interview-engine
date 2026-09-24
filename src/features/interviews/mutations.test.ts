// @vitest-environment node
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { candidates, competencyEvaluations, interviewSessions, interviewTemplates, positions, questionEvaluations } from "@/db/schema";
import { createCompetency, createQuestion } from "@/features/templates/mutations";
import { rateQuestion, updateQuestionNotes } from "./mutations";

async function createFixture() {
  const [position] = await db
    .insert(positions)
    .values({ title: `Test Position ${randomUUID()}` })
    .returning();
  const [template] = await db
    .insert(interviewTemplates)
    .values({ positionId: position.id, stage: "technical", name: "Test Template" })
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
  const [candidate] = await db
    .insert(candidates)
    .values({ name: `Test Candidate ${randomUUID()}` })
    .returning();
  const [session] = await db
    .insert(interviewSessions)
    .values({ candidateId: candidate.id, templateId: template.id })
    .returning();

  return { template, competency, question, secondQuestion, session };
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
