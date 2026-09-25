import { and, asc, desc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import {
  aiGenerationRecords,
  competencies,
  interviewTemplates,
  jobAnalyses,
  mandatoryRequirements,
  positions,
  questions,
} from "@/db/schema";

export function listTemplates() {
  return db
    .select({
      id: interviewTemplates.id,
      name: interviewTemplates.name,
      stage: interviewTemplates.stage,
      version: interviewTemplates.version,
      status: interviewTemplates.status,
      createdAt: interviewTemplates.createdAt,
      positionId: positions.id,
      positionTitle: positions.title,
    })
    .from(interviewTemplates)
    .innerJoin(positions, eq(interviewTemplates.positionId, positions.id))
    .orderBy(desc(interviewTemplates.createdAt));
}

export function getTemplate(id: string) {
  return db.query.interviewTemplates.findFirst({
    where: eq(interviewTemplates.id, id),
  });
}

/** Templates a candidate can actually be interviewed against (plan §22/
 * Phase 7) — `approved` (published, not yet used) or `locked` (already in
 * use by another session; a version can back more than one candidate's
 * session). A `draft` is excluded: it hasn't been through the human
 * review/approve gate (ADR-004) yet. */
export function listPublishedTemplates() {
  return db
    .select({
      id: interviewTemplates.id,
      name: interviewTemplates.name,
      stage: interviewTemplates.stage,
      interviewLanguage: interviewTemplates.interviewLanguage,
      version: interviewTemplates.version,
      status: interviewTemplates.status,
      positionId: positions.id,
      positionTitle: positions.title,
    })
    .from(interviewTemplates)
    .innerJoin(positions, eq(interviewTemplates.positionId, positions.id))
    .where(ne(interviewTemplates.status, "draft"))
    .orderBy(desc(interviewTemplates.createdAt));
}

/** The Dashboard's "Attention Required" counterpart to
 * {@link listPublishedTemplates} (plan Phase 15/§41 Task 15.3) — templates
 * generated but never approved/published, which is exactly the "template
 * generated but not approved" attention case the task's own §22 dashboard
 * sketch names. */
export function listDraftTemplates() {
  return db
    .select({
      id: interviewTemplates.id,
      name: interviewTemplates.name,
      stage: interviewTemplates.stage,
      version: interviewTemplates.version,
      positionId: positions.id,
      positionTitle: positions.title,
    })
    .from(interviewTemplates)
    .innerJoin(positions, eq(interviewTemplates.positionId, positions.id))
    .where(eq(interviewTemplates.status, "draft"))
    .orderBy(desc(interviewTemplates.createdAt));
}

export function listCompetencies(templateId: string) {
  return db.query.competencies.findMany({
    where: eq(competencies.templateId, templateId),
    orderBy: [asc(competencies.sortOrder), asc(competencies.createdAt)],
  });
}

export function getCompetency(id: string) {
  return db.query.competencies.findFirst({ where: eq(competencies.id, id) });
}

export function listMandatoryRequirements(templateId: string) {
  return db.query.mandatoryRequirements.findMany({
    where: eq(mandatoryRequirements.templateId, templateId),
    orderBy: [asc(mandatoryRequirements.sortOrder), asc(mandatoryRequirements.createdAt)],
  });
}

export function getMandatoryRequirement(id: string) {
  return db.query.mandatoryRequirements.findFirst({
    where: eq(mandatoryRequirements.id, id),
  });
}

export function listQuestions(templateId: string) {
  return db.query.questions.findMany({
    where: eq(questions.templateId, templateId),
    orderBy: [asc(questions.sortOrder), asc(questions.createdAt)],
  });
}

export function getQuestion(id: string) {
  return db.query.questions.findFirst({ where: eq(questions.id, id) });
}

export interface CompetencyBlueprint {
  competencyName: string;
  coverage: string;
  questionTypeMix: string;
}

/**
 * The Question Blueprint (plan §39.6) that constrained the template's most
 * recent AI generation — recorded on `AIGenerationRecord.blueprint` at
 * generation time (Phase 5) but, until Phase 16/§41 Task 16.4, never read
 * back anywhere: the human reviewer approving a generated template couldn't
 * see the blueprint that produced it. `null` for a hand-authored template
 * (no generation ever ran) or one predating this shape.
 */
export async function getLatestTemplateDraftBlueprint(
  templateId: string
): Promise<CompetencyBlueprint[] | null> {
  const record = await db.query.aiGenerationRecords.findFirst({
    where: and(
      eq(aiGenerationRecords.templateId, templateId),
      eq(aiGenerationRecords.kind, "template_draft")
    ),
    orderBy: [desc(aiGenerationRecords.createdAt)],
  });
  return (record?.blueprint as CompetencyBlueprint[] | undefined) ?? null;
}

/** The most recent AI analysis of a given Job Description version — a
 * template's "Analyze Job Description" action can be run more than once
 * (e.g. to retry after a validation failure), and only the latest result is
 * shown (plan §16: JobAnalysis "generated -> human-reviewed", not versioned
 * itself). */
export function getLatestJobAnalysis(jobDescriptionId: string) {
  return db.query.jobAnalyses.findFirst({
    where: eq(jobAnalyses.jobDescriptionId, jobDescriptionId),
    orderBy: [desc(jobAnalyses.createdAt)],
  });
}
