// Plain JSON Schema for the two structured-output calls (plan §19), shared
// across providers — Anthropic's tool `input_schema` and Gemini's
// `parametersJsonSchema` both accept standard JSON Schema, so the same
// object describes the contract to either model. Keeping one copy means a
// schema change (a new field, a tightened constraint) can't drift between
// providers. The corresponding Zod schemas in ./schemas.ts are the actual
// validation gate (defense-in-depth); these objects only steer generation.

export const JOB_ANALYSIS_FUNCTION_NAME = "submit_job_analysis";
export const TEMPLATE_DRAFT_FUNCTION_NAME = "submit_template_draft";
export const REGENERATE_QUESTION_FUNCTION_NAME = "submit_regenerated_question";

const NULLABLE_STRING = { type: ["string", "null"] } as const;

export const JOB_ANALYSIS_JSON_SCHEMA = {
  type: "object",
  properties: {
    detectedRoleFamily: NULLABLE_STRING,
    detectedSeniority: NULLABLE_STRING,
    mandatoryRequirements: { type: "array", items: { type: "string" } },
    preferredRequirements: { type: "array", items: { type: "string" } },
    optionalRequirements: { type: "array", items: { type: "string" } },
    notes: { type: "string" },
  },
  required: [
    "detectedRoleFamily",
    "detectedSeniority",
    "mandatoryRequirements",
    "preferredRequirements",
    "optionalRequirements",
    "notes",
  ],
} as const;

// Exported (not just used inline below) so Phase 6's single-question
// regenerate call — validated against the identical shape a full draft's
// questions use — can reuse it directly rather than duplicate it.
export const DRAFT_QUESTION_JSON_SCHEMA = {
  type: "object",
  properties: {
    text: { type: "string" },
    difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
    importance: { type: "string", enum: ["core", "secondary", "optional"] },
    expected: NULLABLE_STRING,
    strong: NULLABLE_STRING,
    acceptable: NULLABLE_STRING,
    concepts: { type: "array", items: { type: "string" } },
    redFlags: { type: "array", items: { type: "string" } },
    followUps: { type: "array", items: { type: "string" } },
    rubric: {
      type: "array",
      items: { type: "string" },
      description: "One entry per 0-5 score, describing what a response at that score looks like.",
    },
    code: NULLABLE_STRING,
    solution: NULLABLE_STRING,
    jdRequirementTag: {
      ...NULLABLE_STRING,
      description:
        "The specific mandatory/preferred JD requirement this question exercises, e.g. 'API Testing' — null if none applies cleanly.",
    },
    altSolutions: {
      ...NULLABLE_STRING,
      description: "For code questions only: other valid approaches besides the primary solution.",
    },
  },
  required: ["text", "difficulty", "importance", "concepts", "redFlags", "followUps", "rubric"],
} as const;

export const TEMPLATE_DRAFT_JSON_SCHEMA = {
  type: "object",
  properties: {
    competencies: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          weight: { type: "integer", minimum: 0, maximum: 100 },
          critical: { type: "boolean" },
          expectedDepth: { type: "string" },
          blueprint: {
            type: "object",
            properties: {
              coverage: { type: "string" },
              questionTypeMix: { type: "string" },
            },
            required: ["coverage", "questionTypeMix"],
          },
          questions: {
            type: "array",
            minItems: 1,
            items: DRAFT_QUESTION_JSON_SCHEMA,
          },
        },
        required: ["name", "weight", "critical", "expectedDepth", "blueprint", "questions"],
      },
    },
    mandatoryRequirements: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          description: NULLABLE_STRING,
        },
        required: ["label"],
      },
    },
  },
  required: ["competencies", "mandatoryRequirements"],
} as const;
