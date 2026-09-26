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

const level1to5 = () =>
  z.coerce
    .number({ error: "Enter a level from 1 to 5." })
    .int("Enter a whole number from 1 to 5.")
    .min(1, "Level must be at least 1.")
    .max(5, "Level must be at most 5.");

/** A 0-100 whole-number field (weights, thresholds) — §40.2: these
 * previously fell through to Zod's default wording ("Invalid option:
 * expected one of ...", "expected number, received NaN") on a blank/invalid
 * submission. */
const percent0to100 = (label: string) =>
  z.coerce
    .number({ error: `${label} must be a number.` })
    .int(`${label} must be a whole number.`)
    .min(0, `${label} must be at least 0.`)
    .max(100, `${label} must be at most 100.`);

/** The artifact's multi-line "one item per line" text-area pattern for
 * concepts/redFlags/followUps/rubric (plan §2.3/§19), parsed into an array.
 * Capped (§40.4) — previously unbounded, so a pasted wall of text could
 * persist as a single field with no upper bound on either line count or
 * line length. Bounds match `AI_LIST_ITEM_MAX`/`AI_LIST_MAX` in
 * services/ai/schemas.ts, which the AI-generated equivalent of this same
 * field must also respect (§40.4's "align the AI schemas' bounds with the
 * form schemas'"). */
const lines = z
  .string()
  .optional()
  .transform((v) =>
    (v ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
  )
  .pipe(
    z
      .array(z.string().max(500, "Each line must be 500 characters or fewer."))
      .max(30, "30 lines maximum.")
  );

export const templateFormSchema = z.object({
  positionId: z.string().min(1, "Select a Position."),
  // Kept as a literal tuple (not derived from stage-config's array type) so
  // Zod's inference stays a clean union — the two lists are asserted equal
  // by src/features/templates/schemas.test.ts.
  stage: z.enum(["technical", "screening"], { error: "Select a valid interview stage." }),
  name: z.string().trim().min(1, "Name is required").max(200),
  // The interview's content language (plan Phase 21/§42) — required, not
  // defaulted, so template creation never silently picks a language for the
  // reviewer; matches INTERVIEW_LANGUAGES, asserted equal in schemas.test.ts
  // for the same reason as `stage` above.
  interviewLanguage: z.enum(["en", "es"], { error: "Select an interview language." }),
});

export type TemplateFormValues = z.infer<typeof templateFormSchema>;

export const scoringConfigFormSchema = z
  .object({
    passThreshold: percent0to100("Pass threshold"),
    borderlineMin: percent0to100("Borderline minimum"),
    criticalMin: percent0to100("Critical minimum"),
    minCompletion: percent0to100("Minimum completion"),
    // Gate config for the "English" SupplementaryAssessment (plan §9/§17) —
    // whether it's required for a PASS, and what level clears the bar.
    englishRequired: checkbox,
    englishMinLevel: level1to5().default(3),
    // First Screening only (plan Phase 22/§43.11) — opt-in, never generated
    // or scored indiscriminately. Harmless no-ops for a Technical Interview
    // template, which never surfaces these toggles in the UI.
    includeCompensationQuestion: checkbox,
    includeWorkAuthorizationCheck: checkbox,
    // Technical Interview only (plan Phase 25/§45) — opt-in, off by default;
    // the mirror-image precedent of the two screening toggles above. A
    // harmless no-op for a screening template, which never surfaces this
    // toggle and whose stage ceiling forces it off regardless (ai-actions.ts).
    includeCodeExercises: checkbox,
  })
  .refine((v) => v.borderlineMin <= v.passThreshold, {
    message: "Borderline minimum must not exceed the pass threshold.",
    path: ["borderlineMin"],
  });

export type ScoringConfigFormValues = z.infer<typeof scoringConfigFormSchema>;

export const competencyFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  weight: percent0to100("Weight"),
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
  text: z.string().trim().min(1, "Question text is required").max(2000),
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
  // Phase 16/§41: the artifact's "JD: <requirement>" traceability tag and
  // its "other valid approaches" note for code questions.
  jdRequirementTag: optionalText(500),
  altSolutions: optionalText(2000),
  // First Screening HR-usability fields (plan Phase 22/§43.7/§43.12) —
  // human-editable the same as any AI-generated field; meaningful mainly
  // for screening-stage questions but not restricted to them.
  requiresTechnicalKnowledge: checkbox,
  technicalTermHelper: optionalText(2000),
});

export type QuestionFormValues = z.infer<typeof questionFormSchema>;
