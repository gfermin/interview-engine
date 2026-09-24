// Zod schemas validating AI structured output before it's allowed to touch
// the database (plan §19, ADR-004) — mirrors the artifact's Question shape
// plus the new MandatoryRequirement/expectedDepth/blueprint fields (§39).
// A failed validation blocks persistence entirely; the caller surfaces the
// raw AI output for manual correction (plan §28) rather than falling back
// to unvalidated content.
import { z } from "zod";

export const jobAnalysisResultSchema = z.object({
  detectedRoleFamily: z.string().trim().min(1).nullable(),
  detectedSeniority: z.string().trim().min(1).nullable(),
  mandatoryRequirements: z.array(z.string().trim().min(1)),
  preferredRequirements: z.array(z.string().trim().min(1)),
  optionalRequirements: z.array(z.string().trim().min(1)),
  notes: z.string().trim(),
});

export type JobAnalysisResult = z.infer<typeof jobAnalysisResultSchema>;

const draftQuestionSchema = z.object({
  text: z.string().trim().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]),
  importance: z.enum(["core", "secondary", "optional"]),
  expected: z.string().trim().nullable().default(null),
  strong: z.string().trim().nullable().default(null),
  acceptable: z.string().trim().nullable().default(null),
  concepts: z.array(z.string().trim().min(1)).default([]),
  redFlags: z.array(z.string().trim().min(1)).default([]),
  followUps: z.array(z.string().trim().min(1)).default([]),
  // Ideally 6 entries (one per 0-5 score, plan §2.3) but not hard-enforced —
  // a shorter rubric is still useful draft content for human review rather
  // than a reason to discard the whole generation.
  rubric: z.array(z.string().trim().min(1)).default([]),
  code: z.string().trim().nullable().default(null),
  solution: z.string().trim().nullable().default(null),
});

const draftCompetencySchema = z.object({
  name: z.string().trim().min(1),
  weight: z.number().int().min(0).max(100),
  critical: z.boolean(),
  // Seniority-relative rubric anchor (plan §39.4) — what "3, Meets Expected
  // Level" looks like for this competency at the requested seniority.
  expectedDepth: z.string().trim().min(1),
  // The Question Blueprint step (plan §39.6) surfaced per competency —
  // persisted only in AIGenerationRecord.blueprint, never on the
  // competency row itself.
  blueprint: z.object({
    coverage: z.string().trim().min(1),
    questionTypeMix: z.string().trim().min(1),
  }),
  questions: z.array(draftQuestionSchema).min(1),
});

const draftMandatoryRequirementSchema = z.object({
  label: z.string().trim().min(1),
  description: z.string().trim().nullable().default(null),
});

export const templateDraftSchema = z.object({
  competencies: z.array(draftCompetencySchema).min(1),
  mandatoryRequirements: z.array(draftMandatoryRequirementSchema).default([]),
});

export type TemplateDraft = z.infer<typeof templateDraftSchema>;
export type TemplateDraftCompetency = TemplateDraft["competencies"][number];
export type TemplateDraftQuestion = TemplateDraftCompetency["questions"][number];
