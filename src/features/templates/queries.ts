import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  competencies,
  interviewTemplates,
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
