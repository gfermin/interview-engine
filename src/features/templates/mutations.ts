import { and, asc, desc, eq, gt, lt } from "drizzle-orm";
import { db } from "@/db";
import {
  aiGenerationRecords,
  competencies,
  interviewTemplates,
  jobAnalyses,
  mandatoryRequirements,
  questions,
} from "@/db/schema";
import { checkPublishable, isTemplateEditable } from "@/domain/interviews/template-versioning";
import type { JobAnalysisResult, TemplateDraft, TemplateDraftQuestion } from "@/services/ai/schemas";
import type {
  CompetencyFormValues,
  MandatoryRequirementFormValues,
  QuestionFormValues,
  ScoringConfigFormValues,
  TemplateFormValues,
} from "./schemas";
import { getCompetency, getMandatoryRequirement, getQuestion, getTemplate } from "./queries";

class TemplateNotEditableError extends Error {
  constructor() {
    super(
      "This template version is no longer editable (it has been published or is in use). Create a new version to make changes."
    );
    this.name = "TemplateNotEditableError";
  }
}

async function requireEditableTemplate(templateId: string) {
  const template = await getTemplate(templateId);
  if (!template) throw new Error("Template not found.");
  if (!isTemplateEditable(template)) throw new TemplateNotEditableError();
  return template;
}

export async function createTemplate(
  input: TemplateFormValues & { jobDescriptionId?: string | null }
) {
  const [template] = await db
    .insert(interviewTemplates)
    .values({
      positionId: input.positionId,
      jobDescriptionId: input.jobDescriptionId ?? null,
      stage: input.stage,
      name: input.name,
    })
    .returning();
  return template;
}

export async function updateScoringConfig(
  templateId: string,
  input: ScoringConfigFormValues
) {
  await requireEditableTemplate(templateId);
  const [template] = await db
    .update(interviewTemplates)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(interviewTemplates.id, templateId))
    .returning();
  return template;
}

/** draft -> approved (plan §22/ADR-008). Validated against
 * {@link checkPublishable} — the only point in Phase 4 where weight-sum /
 * "at least one competency" is enforced; editing itself is never blocked. */
export async function publishTemplate(templateId: string) {
  const template = await getTemplate(templateId);
  if (!template) throw new Error("Template not found.");

  const templateCompetencies = await db.query.competencies.findMany({
    where: eq(competencies.templateId, templateId),
  });

  const check = checkPublishable(template, templateCompetencies);
  if (!check.publishable) {
    throw new Error(check.errors.join(" "));
  }

  const [updated] = await db
    .update(interviewTemplates)
    .set({ status: "approved", updatedAt: new Date() })
    .where(eq(interviewTemplates.id, templateId))
    .returning();
  return updated;
}

/**
 * Forks an approved/locked template into a new draft version (v+1),
 * duplicating its Competencies, MandatoryRequirements, and Questions
 * (plan §22). The source template and its historical Sessions (Phase 7+)
 * are left untouched — only the new version is editable going forward.
 */
export async function createNewTemplateVersion(templateId: string) {
  const source = await getTemplate(templateId);
  if (!source) throw new Error("Template not found.");
  if (source.status === "draft") {
    throw new Error("This template is already a draft — no new version needed.");
  }

  const [sourceCompetencies, sourceRequirements, sourceQuestions] = await Promise.all([
    db.query.competencies.findMany({ where: eq(competencies.templateId, templateId) }),
    db.query.mandatoryRequirements.findMany({
      where: eq(mandatoryRequirements.templateId, templateId),
    }),
    db.query.questions.findMany({ where: eq(questions.templateId, templateId) }),
  ]);

  const [newTemplate] = await db
    .insert(interviewTemplates)
    .values({
      positionId: source.positionId,
      jobDescriptionId: source.jobDescriptionId,
      stage: source.stage,
      name: source.name,
      version: source.version + 1,
      status: "draft",
      passThreshold: source.passThreshold,
      borderlineMin: source.borderlineMin,
      criticalMin: source.criticalMin,
      minCompletion: source.minCompletion,
      englishRequired: source.englishRequired,
      englishMinLevel: source.englishMinLevel,
    })
    .returning();

  const competencyIdMap = new Map<string, string>();
  for (const c of sourceCompetencies) {
    const [inserted] = await db
      .insert(competencies)
      .values({
        templateId: newTemplate.id,
        name: c.name,
        weight: c.weight,
        critical: c.critical,
        expectedDepth: c.expectedDepth,
        sortOrder: c.sortOrder,
      })
      .returning();
    competencyIdMap.set(c.id, inserted.id);
  }

  if (sourceRequirements.length > 0) {
    await db.insert(mandatoryRequirements).values(
      sourceRequirements.map((r) => ({
        templateId: newTemplate.id,
        label: r.label,
        description: r.description,
        sortOrder: r.sortOrder,
      }))
    );
  }

  if (sourceQuestions.length > 0) {
    await db.insert(questions).values(
      sourceQuestions.map((q) => ({
        templateId: newTemplate.id,
        competencyId: competencyIdMap.get(q.competencyId)!,
        text: q.text,
        difficulty: q.difficulty,
        importance: q.importance,
        expected: q.expected,
        strong: q.strong,
        acceptable: q.acceptable,
        concepts: q.concepts,
        redFlags: q.redFlags,
        followUps: q.followUps,
        rubric: q.rubric,
        code: q.code,
        solution: q.solution,
        sortOrder: q.sortOrder,
      }))
    );
  }

  return newTemplate;
}

// ---------------------------------------------------------------------------
// Competencies
// ---------------------------------------------------------------------------

export async function createCompetency(
  templateId: string,
  input: CompetencyFormValues
) {
  await requireEditableTemplate(templateId);
  const existing = await db.query.competencies.findMany({
    where: eq(competencies.templateId, templateId),
  });
  const [created] = await db
    .insert(competencies)
    .values({ templateId, ...input, sortOrder: existing.length })
    .returning();
  return created;
}

export async function updateCompetency(id: string, input: CompetencyFormValues) {
  const competency = await getCompetency(id);
  if (!competency) throw new Error("Competency not found.");
  await requireEditableTemplate(competency.templateId);
  const [updated] = await db
    .update(competencies)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(competencies.id, id))
    .returning();
  return updated;
}

export async function deleteCompetency(id: string) {
  const competency = await getCompetency(id);
  if (!competency) return;
  await requireEditableTemplate(competency.templateId);
  await db.delete(competencies).where(eq(competencies.id, id));
}

export async function moveCompetency(id: string, direction: "up" | "down") {
  const competency = await getCompetency(id);
  if (!competency) throw new Error("Competency not found.");
  await requireEditableTemplate(competency.templateId);

  const sibling = await db.query.competencies.findFirst({
    where: and(
      eq(competencies.templateId, competency.templateId),
      direction === "up"
        ? lt(competencies.sortOrder, competency.sortOrder)
        : gt(competencies.sortOrder, competency.sortOrder)
    ),
    orderBy: direction === "up" ? [desc(competencies.sortOrder)] : [asc(competencies.sortOrder)],
  });
  if (!sibling) return;

  // better-sqlite3 transactions must be synchronous (drizzle's TS signature
  // doesn't enforce this, but an async callback throws at runtime — see
  // mutations.test.ts) — call `.run()` directly rather than `await`.
  db.transaction((tx) => {
    tx.update(competencies)
      .set({ sortOrder: sibling.sortOrder })
      .where(eq(competencies.id, competency.id))
      .run();
    tx.update(competencies)
      .set({ sortOrder: competency.sortOrder })
      .where(eq(competencies.id, sibling.id))
      .run();
  });
}

// ---------------------------------------------------------------------------
// Mandatory Requirements
// ---------------------------------------------------------------------------

export async function createMandatoryRequirement(
  templateId: string,
  input: MandatoryRequirementFormValues
) {
  await requireEditableTemplate(templateId);
  const existing = await db.query.mandatoryRequirements.findMany({
    where: eq(mandatoryRequirements.templateId, templateId),
  });
  const [created] = await db
    .insert(mandatoryRequirements)
    .values({ templateId, ...input, sortOrder: existing.length })
    .returning();
  return created;
}

export async function updateMandatoryRequirement(
  id: string,
  input: MandatoryRequirementFormValues
) {
  const requirement = await getMandatoryRequirement(id);
  if (!requirement) throw new Error("Mandatory requirement not found.");
  await requireEditableTemplate(requirement.templateId);
  const [updated] = await db
    .update(mandatoryRequirements)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(mandatoryRequirements.id, id))
    .returning();
  return updated;
}

export async function deleteMandatoryRequirement(id: string) {
  const requirement = await getMandatoryRequirement(id);
  if (!requirement) return;
  await requireEditableTemplate(requirement.templateId);
  await db.delete(mandatoryRequirements).where(eq(mandatoryRequirements.id, id));
}

export async function moveMandatoryRequirement(id: string, direction: "up" | "down") {
  const requirement = await getMandatoryRequirement(id);
  if (!requirement) throw new Error("Mandatory requirement not found.");
  await requireEditableTemplate(requirement.templateId);

  const sibling = await db.query.mandatoryRequirements.findFirst({
    where: and(
      eq(mandatoryRequirements.templateId, requirement.templateId),
      direction === "up"
        ? lt(mandatoryRequirements.sortOrder, requirement.sortOrder)
        : gt(mandatoryRequirements.sortOrder, requirement.sortOrder)
    ),
    orderBy:
      direction === "up"
        ? [desc(mandatoryRequirements.sortOrder)]
        : [asc(mandatoryRequirements.sortOrder)],
  });
  if (!sibling) return;

  db.transaction((tx) => {
    tx.update(mandatoryRequirements)
      .set({ sortOrder: sibling.sortOrder })
      .where(eq(mandatoryRequirements.id, requirement.id))
      .run();
    tx.update(mandatoryRequirements)
      .set({ sortOrder: requirement.sortOrder })
      .where(eq(mandatoryRequirements.id, sibling.id))
      .run();
  });
}

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

export async function createQuestion(templateId: string, input: QuestionFormValues) {
  await requireEditableTemplate(templateId);
  // sortOrder is scoped to the competency group, matching moveQuestion's
  // "up/down within this competency's list" semantics.
  const existingInCompetency = await db.query.questions.findMany({
    where: eq(questions.competencyId, input.competencyId),
  });
  const [created] = await db
    .insert(questions)
    .values({ templateId, ...input, sortOrder: existingInCompetency.length })
    .returning();
  return created;
}

export async function updateQuestion(id: string, input: QuestionFormValues) {
  const question = await getQuestion(id);
  if (!question) throw new Error("Question not found.");
  await requireEditableTemplate(question.templateId);
  const [updated] = await db
    .update(questions)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(questions.id, id))
    .returning();
  return updated;
}

/**
 * Replaces a question's content in place (Phase 6) — same `id`,
 * `competencyId`, `templateId`, and `sortOrder` as before, only the
 * AI-generated fields change. Deliberately an update, not a delete+insert:
 * the plan's own stated risk for this feature is "could drift the
 * question's id/order," which an in-place update sidesteps entirely.
 */
export async function applyRegeneratedQuestion(
  id: string,
  regenerated: TemplateDraftQuestion,
  options: { includeCodeExercises: boolean }
) {
  const question = await getQuestion(id);
  if (!question) throw new Error("Question not found.");
  await requireEditableTemplate(question.templateId);

  const [updated] = await db
    .update(questions)
    .set({
      text: regenerated.text,
      difficulty: regenerated.difficulty,
      importance: regenerated.importance,
      expected: regenerated.expected,
      strong: regenerated.strong,
      acceptable: regenerated.acceptable,
      concepts: regenerated.concepts,
      redFlags: regenerated.redFlags,
      followUps: regenerated.followUps,
      rubric: regenerated.rubric,
      code: options.includeCodeExercises ? regenerated.code : null,
      solution: options.includeCodeExercises ? regenerated.solution : null,
      updatedAt: new Date(),
    })
    .where(eq(questions.id, id))
    .returning();
  return updated;
}

export async function deleteQuestion(id: string) {
  const question = await getQuestion(id);
  if (!question) return;
  await requireEditableTemplate(question.templateId);
  await db.delete(questions).where(eq(questions.id, id));
}

/** Reorders within the question's own competency group (not the whole
 * template) — the builder UI groups questions by competency, so "up/down"
 * means "within this competency's question list." */
export async function moveQuestion(id: string, direction: "up" | "down") {
  const question = await getQuestion(id);
  if (!question) throw new Error("Question not found.");
  await requireEditableTemplate(question.templateId);

  const sibling = await db.query.questions.findFirst({
    where: and(
      eq(questions.competencyId, question.competencyId),
      direction === "up"
        ? lt(questions.sortOrder, question.sortOrder)
        : gt(questions.sortOrder, question.sortOrder)
    ),
    orderBy: direction === "up" ? [desc(questions.sortOrder)] : [asc(questions.sortOrder)],
  });
  if (!sibling) return;

  db.transaction((tx) => {
    tx.update(questions)
      .set({ sortOrder: sibling.sortOrder })
      .where(eq(questions.id, question.id))
      .run();
    tx.update(questions)
      .set({ sortOrder: question.sortOrder })
      .where(eq(questions.id, sibling.id))
      .run();
  });
}

// ---------------------------------------------------------------------------
// AI generation (Phase 5)
// ---------------------------------------------------------------------------

export async function saveJobAnalysis(jobDescriptionId: string, result: JobAnalysisResult) {
  const [created] = await db
    .insert(jobAnalyses)
    .values({
      jobDescriptionId,
      detectedRoleFamily: result.detectedRoleFamily,
      detectedSeniority: result.detectedSeniority,
      mandatoryRequirements: result.mandatoryRequirements,
      preferredRequirements: result.preferredRequirements,
      optionalRequirements: result.optionalRequirements,
      notes: result.notes,
    })
    .returning();
  return created;
}

interface RecordAIGenerationInput {
  kind: "job_analysis" | "template_draft" | "question_regeneration";
  jobDescriptionId?: string | null;
  templateId?: string | null;
  provider: string;
  model: string;
  promptVersion: string;
  blueprint?: unknown;
}

/** Provenance row (plan §17) — written only after a generation has already
 * been Zod-validated and (for a draft) persisted; a failed call never
 * reaches here (see ai-actions.ts). */
export async function recordAIGeneration(input: RecordAIGenerationInput) {
  const [created] = await db
    .insert(aiGenerationRecords)
    .values({
      kind: input.kind,
      jobDescriptionId: input.jobDescriptionId ?? null,
      templateId: input.templateId ?? null,
      provider: input.provider,
      model: input.model,
      promptVersion: input.promptVersion,
      blueprint: input.blueprint ?? null,
    })
    .returning();
  return created;
}

/**
 * Bulk-inserts an AI-generated draft's Competencies (each with its
 * Question-Blueprint-constrained Questions) and MandatoryRequirements into
 * an editable template, in one transaction. Only meant to populate a fresh
 * draft (the caller enforces the template's Competency list is currently
 * empty) — this does not merge into or replace hand-authored content.
 */
export async function applyGeneratedDraft(
  templateId: string,
  draft: TemplateDraft,
  options: { includeCodeExercises: boolean }
) {
  await requireEditableTemplate(templateId);

  // better-sqlite3 transactions must be synchronous (see mutations.test.ts) —
  // use `.get()`/`.run()` directly rather than `await`/`.returning()`'s
  // thenable, which would silently escape the transaction (and briefly threw
  // "Transaction function cannot return a promise" here during development).
  db.transaction((tx) => {
    draft.competencies.forEach((draftCompetency, competencyIndex) => {
      const competency = tx
        .insert(competencies)
        .values({
          templateId,
          name: draftCompetency.name,
          weight: draftCompetency.weight,
          critical: draftCompetency.critical,
          expectedDepth: draftCompetency.expectedDepth,
          sortOrder: competencyIndex,
        })
        .returning()
        .get();

      draftCompetency.questions.forEach((draftQuestion, questionIndex) => {
        tx.insert(questions)
          .values({
            templateId,
            competencyId: competency.id,
            text: draftQuestion.text,
            difficulty: draftQuestion.difficulty,
            importance: draftQuestion.importance,
            expected: draftQuestion.expected,
            strong: draftQuestion.strong,
            acceptable: draftQuestion.acceptable,
            concepts: draftQuestion.concepts,
            redFlags: draftQuestion.redFlags,
            followUps: draftQuestion.followUps,
            rubric: draftQuestion.rubric,
            // Defensive: strip code/solution even if the model returned
            // them for a stage that doesn't use hands-on exercises (plan
            // §39.7's "AI review doesn't gate what only a human should
            // approve" — this is data hygiene, not a review step).
            code: options.includeCodeExercises ? draftQuestion.code : null,
            solution: options.includeCodeExercises ? draftQuestion.solution : null,
            sortOrder: questionIndex,
          })
          .run();
      });
    });

    if (draft.mandatoryRequirements.length > 0) {
      tx.insert(mandatoryRequirements)
        .values(
          draft.mandatoryRequirements.map((requirement, index) => ({
            templateId,
            label: requirement.label,
            description: requirement.description,
            sortOrder: index,
          }))
        )
        .run();
    }
  });
}
