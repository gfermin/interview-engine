// Zod schemas validating AI structured output before it's allowed to touch
// the database (plan §19, ADR-004) — mirrors the artifact's Question shape
// plus the new MandatoryRequirement/expectedDepth/blueprint fields (§39).
// A failed validation blocks persistence entirely; the caller surfaces the
// raw AI output for manual correction (plan §28) rather than falling back
// to unvalidated content.
import { z } from "zod";

// Bounds mirror the human-authored form schemas (templates/schemas.ts,
// positions/schemas.ts) — §40.4: AI-generated content previously had no
// length caps at all, while the form schemas did, so a generation that
// happened to exceed those caps saved fine on first insert (applyGenerated-
// Draft bypasses the form schema) but then failed validation the first time
// a human edited it afterward through the form. Keeping one named constant
// per bound (rather than repeating literals) is what makes that alignment
// checkable at a glance against templates/schemas.ts.
const AI_NAME_MAX = 200; // templates/schemas.ts: competency name / requirement label
const AI_LONG_TEXT_MAX = 1000; // templates/schemas.ts: expectedDepth / requirement description
const AI_QUESTION_TEXT_MAX = 2000; // templates/schemas.ts: question text/expected/strong/acceptable
const AI_CODE_MAX = 4000; // templates/schemas.ts: question code/solution
const AI_LIST_ITEM_MAX = 500; // templates/schemas.ts: each concepts/redFlags/followUps/rubric line
const AI_LIST_MAX = 30; // templates/schemas.ts: concepts/redFlags/followUps/rubric array length

export const jobAnalysisResultSchema = z.object({
  detectedRoleFamily: z.string().trim().min(1).max(200).nullable(),
  detectedSeniority: z.string().trim().min(1).max(100).nullable(),
  mandatoryRequirements: z.array(z.string().trim().min(1).max(AI_LIST_ITEM_MAX)).max(AI_LIST_MAX),
  preferredRequirements: z.array(z.string().trim().min(1).max(AI_LIST_ITEM_MAX)).max(AI_LIST_MAX),
  optionalRequirements: z.array(z.string().trim().min(1).max(AI_LIST_ITEM_MAX)).max(AI_LIST_MAX),
  notes: z.string().trim().max(AI_LONG_TEXT_MAX),
});

export type JobAnalysisResult = z.infer<typeof jobAnalysisResultSchema>;

// Exported (not just used internally for templateDraftSchema) so
// regenerateQuestionSchema — one question in isolation, Phase 6 — can
// validate against the identical shape without duplicating it.
export const draftQuestionSchema = z.object({
  text: z.string().trim().min(1).max(AI_QUESTION_TEXT_MAX),
  difficulty: z.enum(["easy", "medium", "hard"]),
  importance: z.enum(["core", "secondary", "optional"]),
  expected: z.string().trim().max(AI_QUESTION_TEXT_MAX).nullable().default(null),
  strong: z.string().trim().max(AI_QUESTION_TEXT_MAX).nullable().default(null),
  acceptable: z.string().trim().max(AI_QUESTION_TEXT_MAX).nullable().default(null),
  concepts: z.array(z.string().trim().min(1).max(AI_LIST_ITEM_MAX)).max(AI_LIST_MAX).default([]),
  redFlags: z.array(z.string().trim().min(1).max(AI_LIST_ITEM_MAX)).max(AI_LIST_MAX).default([]),
  followUps: z.array(z.string().trim().min(1).max(AI_LIST_ITEM_MAX)).max(AI_LIST_MAX).default([]),
  // Ideally 6 entries (one per 0-5 score, plan §2.3) but not hard-enforced —
  // a shorter rubric is still useful draft content for human review rather
  // than a reason to discard the whole generation.
  rubric: z.array(z.string().trim().min(1).max(AI_LIST_ITEM_MAX)).max(AI_LIST_MAX).default([]),
  code: z.string().trim().max(AI_CODE_MAX).nullable().default(null),
  solution: z.string().trim().max(AI_CODE_MAX).nullable().default(null),
  // Phase 16/§41: the artifact's "JD: <requirement>" traceability tag and
  // its "other valid approaches" note for code questions — both optional,
  // matching code/solution's own nullable pattern.
  jdRequirementTag: z.string().trim().max(AI_LIST_ITEM_MAX).nullable().default(null),
  altSolutions: z.string().trim().max(AI_QUESTION_TEXT_MAX).nullable().default(null),
  // First Screening HR-focused generation (plan Phase 22/§43.7/§43.12) —
  // additive, shared by both stages' schema: the technical builder simply
  // never asks the model to set these, so they default false/null there.
  requiresTechnicalKnowledge: z.boolean().default(false),
  technicalTermHelper: z.string().trim().max(AI_QUESTION_TEXT_MAX).nullable().default(null),
});

const draftCompetencySchema = z.object({
  name: z.string().trim().min(1).max(AI_NAME_MAX),
  weight: z.number().int().min(0).max(100),
  critical: z.boolean(),
  // Seniority-relative rubric anchor (plan §39.4) — what "3, Meets Expected
  // Level" looks like for this competency at the requested seniority.
  expectedDepth: z.string().trim().min(1).max(AI_LONG_TEXT_MAX),
  // The Question Blueprint step (plan §39.6) surfaced per competency —
  // persisted only in AIGenerationRecord.blueprint, never on the
  // competency row itself.
  blueprint: z.object({
    coverage: z.string().trim().min(1).max(AI_LONG_TEXT_MAX),
    questionTypeMix: z.string().trim().min(1).max(AI_LONG_TEXT_MAX),
  }),
  questions: z.array(draftQuestionSchema).min(1),
});

const draftMandatoryRequirementSchema = z.object({
  label: z.string().trim().min(1).max(AI_NAME_MAX),
  description: z.string().trim().max(AI_LONG_TEXT_MAX).nullable().default(null),
});

export const templateDraftSchema = z.object({
  competencies: z.array(draftCompetencySchema).min(1),
  mandatoryRequirements: z.array(draftMandatoryRequirementSchema).default([]),
});

export type TemplateDraft = z.infer<typeof templateDraftSchema>;
export type TemplateDraftCompetency = TemplateDraft["competencies"][number];
export type TemplateDraftQuestion = TemplateDraftCompetency["questions"][number];
