// @vitest-environment node
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { competencies, interviewTemplates, jobDescriptions, positions, questions } from "@/db/schema";
import type { TemplateDraft, TemplateDraftQuestion } from "@/services/ai/schemas";
import {
  applyGeneratedDraft,
  applyRegeneratedQuestion,
  createCompetency,
  createQuestion,
  moveCompetency,
  publishTemplate,
  recordAIGeneration,
  saveJobAnalysis,
} from "./mutations";

async function createTestTemplate(stage: "technical" | "screening" = "technical") {
  const [position] = await db
    .insert(positions)
    .values({ title: `Test Position ${randomUUID()}` })
    .returning();
  const [template] = await db
    .insert(interviewTemplates)
    .values({ positionId: position.id, stage, name: "Test Template" })
    .returning();
  return { position, template };
}

const sampleDraft: TemplateDraft = {
  competencies: [
    {
      name: "Programming",
      weight: 60,
      critical: true,
      expectedDepth: "Explains WHY, not just HOW.",
      blueprint: { coverage: "core language", questionTypeMix: "1 practical / 1 debugging" },
      questions: [
        {
          text: "How do you handle flaky tests?",
          difficulty: "hard",
          importance: "core",
          expected: "Investigates root cause.",
          strong: null,
          acceptable: null,
          concepts: ["flakiness"],
          redFlags: [],
          followUps: [],
          rubric: ["0 - no strategy", "5 - systematic investigation"],
          code: "function example() {}",
          solution: "// solution here",
        },
        {
          text: "Explain a debugging exercise.",
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
        },
      ],
    },
    {
      name: "SQL",
      weight: 40,
      critical: false,
      expectedDepth: "Writes correct joins.",
      blueprint: { coverage: "joins, indexing", questionTypeMix: "1 practical" },
      questions: [
        {
          text: "Explain an execution plan.",
          difficulty: "medium",
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
        },
      ],
    },
  ],
  mandatoryRequirements: [{ label: "Work authorization", description: null }],
};

// Regression test for a real bug found while writing applyGeneratedDraft:
// db.transaction(async (tx) => { await tx... }) type-checks (drizzle's TS
// signature doesn't require a sync callback) but throws at runtime against
// the better-sqlite3 driver ("Transaction function cannot return a
// promise") — and because the async callback had already started executing
// before that throw, its writes still happened afterward, un-transactioned,
// as a background race rather than atomically. This is why moveCompetency
// et al. use a synchronous `(tx) => { ...; .run(); }` callback instead.
describe("moveCompetency", () => {
  it("atomically swaps sortOrder with the sibling below", async () => {
    const { template } = await createTestTemplate();
    const first = await createCompetency(template.id, {
      name: "Programming",
      weight: 60,
      critical: false,
      expectedDepth: null,
    });
    const second = await createCompetency(template.id, {
      name: "SQL",
      weight: 40,
      critical: false,
      expectedDepth: null,
    });
    expect(first.sortOrder).toBe(0);
    expect(second.sortOrder).toBe(1);

    await moveCompetency(first.id, "down");

    const reordered = await db.query.competencies.findMany({
      where: eq(competencies.templateId, template.id),
      orderBy: (c, { asc }) => [asc(c.sortOrder)],
    });
    expect(reordered.map((c) => c.name)).toEqual(["SQL", "Programming"]);
  });
});

describe("applyGeneratedDraft", () => {
  it("inserts competencies, questions (in order), and mandatory requirements", async () => {
    const { template } = await createTestTemplate("technical");

    await applyGeneratedDraft(template.id, sampleDraft, { includeCodeExercises: true });

    const savedCompetencies = await db.query.competencies.findMany({
      where: eq(competencies.templateId, template.id),
      orderBy: (c, { asc }) => [asc(c.sortOrder)],
    });
    expect(savedCompetencies.map((c) => c.name)).toEqual(["Programming", "SQL"]);
    expect(savedCompetencies[0].weight).toBe(60);
    expect(savedCompetencies[0].critical).toBe(true);
    expect(savedCompetencies[0].expectedDepth).toBe("Explains WHY, not just HOW.");

    const programmingQuestions = await db.query.questions.findMany({
      where: eq(questions.competencyId, savedCompetencies[0].id),
      orderBy: (q, { asc }) => [asc(q.sortOrder)],
    });
    expect(programmingQuestions).toHaveLength(2);
    expect(programmingQuestions[0].text).toBe("How do you handle flaky tests?");
    expect(programmingQuestions[0].concepts).toEqual(["flakiness"]);
    // Technical stage + includeCodeExercises: true -> code/solution preserved.
    expect(programmingQuestions[0].code).toBe("function example() {}");

    const templateRequirements = await db.query.mandatoryRequirements.findMany({
      where: (r, { eq: eqOp }) => eqOp(r.templateId, template.id),
    });
    expect(templateRequirements).toHaveLength(1);
    expect(templateRequirements[0].label).toBe("Work authorization");
  });

  it("strips code/solution when includeCodeExercises is false (Screening stage)", async () => {
    const { template } = await createTestTemplate("screening");

    await applyGeneratedDraft(template.id, sampleDraft, { includeCodeExercises: false });

    const savedCompetency = await db.query.competencies.findFirst({
      where: eq(competencies.templateId, template.id),
    });
    const savedQuestions = await db.query.questions.findMany({
      where: eq(questions.competencyId, savedCompetency!.id),
    });
    for (const q of savedQuestions) {
      expect(q.code).toBeNull();
      expect(q.solution).toBeNull();
    }
  });

  it("refuses to apply a draft to a non-editable (published) template", async () => {
    const { template } = await createTestTemplate();
    await createCompetency(template.id, { name: "x", weight: 100, critical: false, expectedDepth: null });
    await publishTemplate(template.id);

    await expect(
      applyGeneratedDraft(template.id, sampleDraft, { includeCodeExercises: true })
    ).rejects.toThrow(/no longer editable/);
  });
});

describe("saveJobAnalysis", () => {
  it("persists detected role/seniority and requirement lists", async () => {
    const [position] = await db
      .insert(positions)
      .values({ title: `Test Position ${randomUUID()}` })
      .returning();
    const [jobDescription] = await db
      .insert(jobDescriptions)
      .values({ positionId: position.id, rawText: "We are looking for..." })
      .returning();

    const saved = await saveJobAnalysis(jobDescription.id, {
      detectedRoleFamily: "Quality Assurance",
      detectedSeniority: "Mid-Level",
      mandatoryRequirements: ["5+ years"],
      preferredRequirements: [],
      optionalRequirements: [],
      notes: "Note text.",
    });

    expect(saved.detectedRoleFamily).toBe("Quality Assurance");
    expect(saved.mandatoryRequirements).toEqual(["5+ years"]);
  });
});

describe("recordAIGeneration", () => {
  it("persists a template_draft record with its blueprint", async () => {
    const { template } = await createTestTemplate();

    const record = await recordAIGeneration({
      kind: "template_draft",
      templateId: template.id,
      provider: "anthropic",
      model: "claude-sonnet-5",
      promptVersion: "template-draft-v1",
      blueprint: [{ competencyName: "Programming", coverage: "x", questionTypeMix: "y" }],
    });

    expect(record.kind).toBe("template_draft");
    expect(record.jobDescriptionId).toBeNull();
    expect(record.blueprint).toEqual([
      { competencyName: "Programming", coverage: "x", questionTypeMix: "y" },
    ]);
  });
});

const sampleRegenerated: TemplateDraftQuestion = {
  text: "Walk through diagnosing a memory leak in a long-running service.",
  difficulty: "hard",
  importance: "core",
  expected: "Uses heap snapshots and profiling tools rather than guessing.",
  strong: null,
  acceptable: null,
  concepts: ["heap profiling", "GC tuning"],
  redFlags: [],
  followUps: [],
  rubric: ["0 - no strategy", "5 - systematic investigation"],
  code: "function leak() {}",
  solution: "// fixed version",
};

describe("applyRegeneratedQuestion", () => {
  it("replaces content in place, keeping id/competencyId/sortOrder unchanged", async () => {
    const { template } = await createTestTemplate("technical");
    const competency = await createCompetency(template.id, {
      name: "Programming",
      weight: 100,
      critical: false,
      expectedDepth: null,
    });
    const original = await createQuestion(template.id, {
      competencyId: competency.id,
      text: "How do you handle flaky tests?",
      difficulty: "medium",
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

    const updated = await applyRegeneratedQuestion(original.id, sampleRegenerated, {
      includeCodeExercises: true,
    });

    expect(updated.id).toBe(original.id);
    expect(updated.competencyId).toBe(competency.id);
    expect(updated.sortOrder).toBe(original.sortOrder);
    expect(updated.text).toBe(sampleRegenerated.text);
    expect(updated.difficulty).toBe("hard");
    expect(updated.concepts).toEqual(["heap profiling", "GC tuning"]);
    expect(updated.code).toBe("function leak() {}");
  });

  it("strips code/solution when includeCodeExercises is false", async () => {
    const { template } = await createTestTemplate("screening");
    const competency = await createCompetency(template.id, {
      name: "Communication",
      weight: 100,
      critical: false,
      expectedDepth: null,
    });
    const original = await createQuestion(template.id, {
      competencyId: competency.id,
      text: "Tell me about a conflict you resolved.",
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

    const updated = await applyRegeneratedQuestion(original.id, sampleRegenerated, {
      includeCodeExercises: false,
    });

    expect(updated.code).toBeNull();
    expect(updated.solution).toBeNull();
  });

  it("doesn't affect a sibling question in the same competency", async () => {
    const { template } = await createTestTemplate();
    const competency = await createCompetency(template.id, {
      name: "Programming",
      weight: 100,
      critical: false,
      expectedDepth: null,
    });
    const questionA = await createQuestion(template.id, {
      competencyId: competency.id,
      text: "Question A",
      difficulty: "easy",
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
    const questionB = await createQuestion(template.id, {
      competencyId: competency.id,
      text: "Question B",
      difficulty: "easy",
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

    await applyRegeneratedQuestion(questionA.id, sampleRegenerated, {
      includeCodeExercises: true,
    });

    const siblingUnchanged = await db.query.questions.findFirst({
      where: eq(questions.id, questionB.id),
    });
    expect(siblingUnchanged?.text).toBe("Question B");
  });

  it("throws when the template is no longer editable", async () => {
    const { template } = await createTestTemplate();
    const competency = await createCompetency(template.id, {
      name: "Programming",
      weight: 100,
      critical: false,
      expectedDepth: null,
    });
    const original = await createQuestion(template.id, {
      competencyId: competency.id,
      text: "Original",
      difficulty: "easy",
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
    await publishTemplate(template.id);

    await expect(
      applyRegeneratedQuestion(original.id, sampleRegenerated, { includeCodeExercises: true })
    ).rejects.toThrow(/no longer editable/);
  });
});
