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
  createMandatoryRequirement,
  createNewTemplateVersion,
  createQuestion,
  deleteCompetency,
  deleteMandatoryRequirement,
  deleteQuestion,
  moveCompetency,
  moveMandatoryRequirement,
  moveQuestion,
  publishTemplate,
  recordAIGeneration,
  saveJobAnalysis,
  updateCompetency,
  updateMandatoryRequirement,
  updateQuestion,
  updateScoringConfig,
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
          jdRequirementTag: null,
          altSolutions: null,
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
          jdRequirementTag: null,
          altSolutions: null,
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
          jdRequirementTag: null,
          altSolutions: null,
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
  jdRequirementTag: null,
  altSolutions: null,
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
      jdRequirementTag: null,
      altSolutions: null,
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
      jdRequirementTag: null,
      altSolutions: null,
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
      jdRequirementTag: null,
      altSolutions: null,
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
      jdRequirementTag: null,
      altSolutions: null,
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
      jdRequirementTag: null,
      altSolutions: null,
    });
    await publishTemplate(template.id);

    await expect(
      applyRegeneratedQuestion(original.id, sampleRegenerated, { includeCodeExercises: true })
    ).rejects.toThrow(/no longer editable/);
  });
});

// §40.5 item 1: createNewTemplateVersion had zero coverage despite being
// one of the more complex mutations in the codebase (version-fork,
// competencyId remapping, the "already a draft" refusal).
describe("createNewTemplateVersion", () => {
  async function createPublishedTemplateWithContent() {
    const { template } = await createTestTemplate("technical");
    const competency = await createCompetency(template.id, {
      name: "Programming",
      weight: 100,
      critical: true,
      expectedDepth: "Explains WHY, not just HOW.",
    });
    const question = await createQuestion(template.id, {
      competencyId: competency.id,
      text: "How do you debug a flaky test?",
      difficulty: "hard",
      importance: "core",
      expected: "Investigates root cause.",
      strong: null,
      acceptable: null,
      concepts: ["flakiness"],
      redFlags: [],
      followUps: [],
      rubric: ["0 - no strategy", "5 - systematic investigation"],
      code: null,
      solution: null,
      jdRequirementTag: null,
      altSolutions: null,
    });
    const requirement = await createMandatoryRequirement(template.id, {
      label: "Work authorization",
      description: null,
    });
    await publishTemplate(template.id);
    return { template, competency, question, requirement };
  }

  it("forks competencies, questions (remapped competencyId), and mandatory requirements into a new draft", async () => {
    const { template, competency, question, requirement } = await createPublishedTemplateWithContent();

    const newVersion = await createNewTemplateVersion(template.id);

    expect(newVersion.version).toBe(template.version + 1);
    expect(newVersion.status).toBe("draft");
    expect(newVersion.positionId).toBe(template.positionId);
    expect(newVersion.stage).toBe(template.stage);

    const newCompetencies = await db.query.competencies.findMany({
      where: eq(competencies.templateId, newVersion.id),
    });
    expect(newCompetencies).toHaveLength(1);
    expect(newCompetencies[0].id).not.toBe(competency.id);
    expect(newCompetencies[0].name).toBe("Programming");
    expect(newCompetencies[0].expectedDepth).toBe("Explains WHY, not just HOW.");

    const newQuestions = await db.query.questions.findMany({
      where: eq(questions.templateId, newVersion.id),
    });
    expect(newQuestions).toHaveLength(1);
    expect(newQuestions[0].id).not.toBe(question.id);
    // The whole point of the fork: the copied question points at the *new*
    // template's competency, not the source's.
    expect(newQuestions[0].competencyId).toBe(newCompetencies[0].id);
    expect(newQuestions[0].text).toBe("How do you debug a flaky test?");
    expect(newQuestions[0].concepts).toEqual(["flakiness"]);

    const newRequirements = await db.query.mandatoryRequirements.findMany({
      where: (r, { eq: eqOp }) => eqOp(r.templateId, newVersion.id),
    });
    expect(newRequirements).toHaveLength(1);
    expect(newRequirements[0].id).not.toBe(requirement.id);
    expect(newRequirements[0].label).toBe("Work authorization");
  });

  it("carries interviewLanguage forward unchanged, same as stage", async () => {
    const [position] = await db
      .insert(positions)
      .values({ title: `Test Position ${randomUUID()}` })
      .returning();
    const [template] = await db
      .insert(interviewTemplates)
      .values({ positionId: position.id, stage: "technical", name: "Test Template", interviewLanguage: "es" })
      .returning();
    await createCompetency(template.id, { name: "Programming", weight: 100, critical: false, expectedDepth: null });
    await publishTemplate(template.id);

    const newVersion = await createNewTemplateVersion(template.id);

    expect(newVersion.interviewLanguage).toBe("es");
  });

  it("leaves the source template and its content untouched", async () => {
    const { template, competency } = await createPublishedTemplateWithContent();

    await createNewTemplateVersion(template.id);

    const source = await db.query.interviewTemplates.findFirst({
      where: eq(interviewTemplates.id, template.id),
    });
    expect(source?.status).toBe("approved");
    expect(source?.version).toBe(template.version);

    const sourceCompetencies = await db.query.competencies.findMany({
      where: eq(competencies.templateId, template.id),
    });
    expect(sourceCompetencies).toHaveLength(1);
    expect(sourceCompetencies[0].id).toBe(competency.id);
  });

  it("carries over the scoring configuration", async () => {
    const { template } = await createTestTemplate("technical");
    await createCompetency(template.id, { name: "x", weight: 100, critical: false, expectedDepth: null });
    // Scoring config must be set while still a draft (updateScoringConfig
    // itself requires an editable template) — publish only afterward.
    await updateScoringConfig(template.id, {
      passThreshold: 85,
      borderlineMin: 60,
      criticalMin: 55,
      minCompletion: 80,
      englishRequired: true,
      englishMinLevel: 4,
    });
    await publishTemplate(template.id);

    const newVersion = await createNewTemplateVersion(template.id);

    expect(newVersion.passThreshold).toBe(85);
    expect(newVersion.borderlineMin).toBe(60);
    expect(newVersion.englishRequired).toBe(true);
    expect(newVersion.englishMinLevel).toBe(4);
  });

  it("refuses when the template is still a draft", async () => {
    const { template } = await createTestTemplate();

    await expect(createNewTemplateVersion(template.id)).rejects.toThrow(/already a draft/);
  });

  it("throws when the template doesn't exist", async () => {
    await expect(createNewTemplateVersion(randomUUID())).rejects.toThrow(/not found/);
  });
});

// §40.5 item 2: delete/update mutations and the shared "not editable" guard
// they all depend on had no coverage at all.
describe("editable-template guard shared by delete/update mutations", () => {
  it("updateCompetency refuses once the template is published", async () => {
    const { template } = await createTestTemplate();
    const competency = await createCompetency(template.id, {
      name: "Programming",
      weight: 100,
      critical: false,
      expectedDepth: null,
    });
    await publishTemplate(template.id);

    await expect(
      updateCompetency(competency.id, { name: "Renamed", weight: 100, critical: false, expectedDepth: null })
    ).rejects.toThrow(/no longer editable/);
  });

  it("deleteCompetency refuses once the template is published", async () => {
    const { template } = await createTestTemplate();
    const competency = await createCompetency(template.id, {
      name: "Programming",
      weight: 100,
      critical: false,
      expectedDepth: null,
    });
    await publishTemplate(template.id);

    await expect(deleteCompetency(competency.id)).rejects.toThrow(/no longer editable/);
  });

  it("updateMandatoryRequirement refuses once the template is published", async () => {
    const { template } = await createTestTemplate();
    await createCompetency(template.id, { name: "x", weight: 100, critical: false, expectedDepth: null });
    const requirement = await createMandatoryRequirement(template.id, {
      label: "Work authorization",
      description: null,
    });
    await publishTemplate(template.id);

    await expect(
      updateMandatoryRequirement(requirement.id, { label: "Renamed", description: null })
    ).rejects.toThrow(/no longer editable/);
  });

  it("deleteMandatoryRequirement refuses once the template is published", async () => {
    const { template } = await createTestTemplate();
    await createCompetency(template.id, { name: "x", weight: 100, critical: false, expectedDepth: null });
    const requirement = await createMandatoryRequirement(template.id, {
      label: "Work authorization",
      description: null,
    });
    await publishTemplate(template.id);

    await expect(deleteMandatoryRequirement(requirement.id)).rejects.toThrow(/no longer editable/);
  });

  it("updateQuestion refuses once the template is published", async () => {
    const { template } = await createTestTemplate();
    const competency = await createCompetency(template.id, {
      name: "Programming",
      weight: 100,
      critical: false,
      expectedDepth: null,
    });
    const question = await createQuestion(template.id, {
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
      jdRequirementTag: null,
      altSolutions: null,
    });
    await publishTemplate(template.id);

    await expect(
      updateQuestion(question.id, {
        competencyId: competency.id,
        text: "Edited",
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
        jdRequirementTag: null,
        altSolutions: null,
      })
    ).rejects.toThrow(/no longer editable/);
  });

  it("deleteQuestion refuses once the template is published", async () => {
    const { template } = await createTestTemplate();
    const competency = await createCompetency(template.id, {
      name: "Programming",
      weight: 100,
      critical: false,
      expectedDepth: null,
    });
    const question = await createQuestion(template.id, {
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
      jdRequirementTag: null,
      altSolutions: null,
    });
    await publishTemplate(template.id);

    await expect(deleteQuestion(question.id)).rejects.toThrow(/no longer editable/);
  });

  it("updateScoringConfig refuses once the template is published", async () => {
    const { template } = await createTestTemplate();
    await createCompetency(template.id, { name: "x", weight: 100, critical: false, expectedDepth: null });
    await publishTemplate(template.id);

    await expect(
      updateScoringConfig(template.id, {
        passThreshold: 70,
        borderlineMin: 50,
        criticalMin: 50,
        minCompletion: 70,
        englishRequired: false,
        englishMinLevel: 3,
      })
    ).rejects.toThrow(/no longer editable/);
  });
});

// §40.4's new defensive guard: a competencyId that doesn't belong to the
// template being edited.
describe("createQuestion/updateQuestion competency-ownership guard", () => {
  it("createQuestion refuses a competencyId from a different template", async () => {
    const { template: templateA } = await createTestTemplate();
    const { template: templateB } = await createTestTemplate();
    const competencyInB = await createCompetency(templateB.id, {
      name: "SQL",
      weight: 100,
      critical: false,
      expectedDepth: null,
    });

    await expect(
      createQuestion(templateA.id, {
        competencyId: competencyInB.id,
        text: "Cross-template question",
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
        jdRequirementTag: null,
        altSolutions: null,
      })
    ).rejects.toThrow(/doesn't belong to this template/);
  });

  it("updateQuestion refuses reassigning a question to a competency from a different template", async () => {
    const { template: templateA } = await createTestTemplate();
    const { template: templateB } = await createTestTemplate();
    const competencyInA = await createCompetency(templateA.id, {
      name: "Programming",
      weight: 100,
      critical: false,
      expectedDepth: null,
    });
    const competencyInB = await createCompetency(templateB.id, {
      name: "SQL",
      weight: 100,
      critical: false,
      expectedDepth: null,
    });
    const question = await createQuestion(templateA.id, {
      competencyId: competencyInA.id,
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
      jdRequirementTag: null,
      altSolutions: null,
    });

    await expect(
      updateQuestion(question.id, {
        competencyId: competencyInB.id,
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
        jdRequirementTag: null,
        altSolutions: null,
      })
    ).rejects.toThrow(/doesn't belong to this template/);
  });
});

// §40.5 item 3: only moveCompetency had a test; moveMandatoryRequirement and
// moveQuestion reorder differently enough (moveQuestion is scoped to one
// competency's list) to deserve their own.
describe("moveMandatoryRequirement", () => {
  it("swaps sortOrder with the sibling below", async () => {
    const { template } = await createTestTemplate();
    const first = await createMandatoryRequirement(template.id, { label: "Work authorization", description: null });
    const second = await createMandatoryRequirement(template.id, { label: "Security clearance", description: null });
    expect(first.sortOrder).toBe(0);
    expect(second.sortOrder).toBe(1);

    await moveMandatoryRequirement(first.id, "down");

    const reordered = await db.query.mandatoryRequirements.findMany({
      where: (r, { eq: eqOp }) => eqOp(r.templateId, template.id),
      orderBy: (r, { asc }) => [asc(r.sortOrder)],
    });
    expect(reordered.map((r) => r.label)).toEqual(["Security clearance", "Work authorization"]);
  });

  it("is a no-op moving the first item further up", async () => {
    const { template } = await createTestTemplate();
    const first = await createMandatoryRequirement(template.id, { label: "Only one", description: null });

    await moveMandatoryRequirement(first.id, "up");

    const unchanged = await db.query.mandatoryRequirements.findFirst({
      where: (r, { eq: eqOp }) => eqOp(r.id, first.id),
    });
    expect(unchanged?.sortOrder).toBe(0);
  });
});

describe("moveQuestion", () => {
  it("reorders within its own competency's question list, not across competencies", async () => {
    const { template } = await createTestTemplate();
    const competencyA = await createCompetency(template.id, {
      name: "Programming",
      weight: 50,
      critical: false,
      expectedDepth: null,
    });
    const competencyB = await createCompetency(template.id, {
      name: "SQL",
      weight: 50,
      critical: false,
      expectedDepth: null,
    });
    const a1 = await createQuestion(template.id, {
      competencyId: competencyA.id,
      text: "A1",
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
      jdRequirementTag: null,
      altSolutions: null,
    });
    await createQuestion(template.id, {
      competencyId: competencyA.id,
      text: "A2",
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
      jdRequirementTag: null,
      altSolutions: null,
    });
    const b1 = await createQuestion(template.id, {
      competencyId: competencyB.id,
      text: "B1",
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
      jdRequirementTag: null,
      altSolutions: null,
    });

    await moveQuestion(a1.id, "down");

    const competencyAOrder = await db.query.questions.findMany({
      where: eq(questions.competencyId, competencyA.id),
      orderBy: (q, { asc }) => [asc(q.sortOrder)],
    });
    expect(competencyAOrder.map((q) => q.text)).toEqual(["A2", "A1"]);

    // competency B's single question is untouched by A's reorder.
    const competencyBQuestion = await db.query.questions.findFirst({
      where: eq(questions.id, b1.id),
    });
    expect(competencyBQuestion?.sortOrder).toBe(0);
  });
});
