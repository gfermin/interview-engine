import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

/** A checkbox input is present in FormData as `"on"` when checked and absent
 * entirely when unchecked — never `"false"`. */
const checkbox = z.preprocess((v) => v === "on" || v === true, z.boolean());

/** The artifact's multi-line "one item per line" text-area pattern for
 * concepts/redFlags/followUps/rubric (plan §2.3/§19), parsed into an array. */
const lines = z
  .string()
  .optional()
  .transform((v) =>
    (v ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
  );

export const templateFormSchema = z.object({
  positionId: z.string().min(1, "Select a Position."),
  // Kept as a literal tuple (not derived from stage-config's array type) so
  // Zod's inference stays a clean union — the two lists are asserted equal
  // by src/features/templates/schemas.test.ts.
  stage: z.enum(["technical", "screening"]),
  name: z.string().trim().min(1, "Name is required").max(200),
});

export type TemplateFormValues = z.infer<typeof templateFormSchema>;

export const scoringConfigFormSchema = z
  .object({
    passThreshold: z.coerce.number().int().min(0).max(100),
    borderlineMin: z.coerce.number().int().min(0).max(100),
    criticalMin: z.coerce.number().int().min(0).max(100),
    minCompletion: z.coerce.number().int().min(0).max(100),
  })
  .refine((v) => v.borderlineMin <= v.passThreshold, {
    message: "Borderline minimum must not exceed the pass threshold.",
    path: ["borderlineMin"],
  });

export type ScoringConfigFormValues = z.infer<typeof scoringConfigFormSchema>;

export const competencyFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  weight: z.coerce.number().int().min(0, "Weight must be 0-100").max(100),
  critical: checkbox,
  // Seniority-relative rubric anchor (plan §39.4) — what "3, Meets Expected
  // Level" looks like for this competency at this template's seniority.
  expectedDepth: optionalText(1000),
});

export type CompetencyFormValues = z.infer<typeof competencyFormSchema>;

export const mandatoryRequirementFormSchema = z.object({
  label: z.string().trim().min(1, "Label is required").max(200),
  description: optionalText(1000),
});

export type MandatoryRequirementFormValues = z.infer<
  typeof mandatoryRequirementFormSchema
>;

export const questionFormSchema = z.object({
  competencyId: z.string().min(1, "Select a competency."),
  text: z.string().trim().min(1, "Question text is required"),
  difficulty: z.enum(["easy", "medium", "hard"]),
  importance: z.enum(["core", "secondary", "optional"]),
  expected: optionalText(2000),
  strong: optionalText(2000),
  acceptable: optionalText(2000),
  concepts: lines,
  redFlags: lines,
  followUps: lines,
  rubric: lines,
  code: optionalText(4000),
  solution: optionalText(4000),
});

export type QuestionFormValues = z.infer<typeof questionFormSchema>;
