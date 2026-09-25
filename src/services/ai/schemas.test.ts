import { describe, expect, it } from "vitest";
import { jobAnalysisResultSchema, templateDraftSchema } from "./schemas";

describe("jobAnalysisResultSchema", () => {
  const valid = {
    detectedRoleFamily: "Quality Assurance",
    detectedSeniority: "Mid-Level",
    mandatoryRequirements: ["5+ years test automation"],
    preferredRequirements: ["JMeter experience"],
    optionalRequirements: [],
    notes: "Emphasizes performance testing more than a typical QA posting.",
  };

  it("accepts a well-formed job analysis", () => {
    expect(jobAnalysisResultSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts null detected role/seniority (the JD may not signal either clearly)", () => {
    const result = jobAnalysisResultSchema.safeParse({
      ...valid,
      detectedRoleFamily: null,
      detectedSeniority: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing required field", () => {
    const { notes: _notes, ...missingNotes } = valid;
    expect(jobAnalysisResultSchema.safeParse(missingNotes).success).toBe(false);
  });

  it("rejects a non-array requirements field", () => {
    const result = jobAnalysisResultSchema.safeParse({
      ...valid,
      mandatoryRequirements: "5+ years test automation",
    });
    expect(result.success).toBe(false);
  });
});

describe("templateDraftSchema", () => {
  const validQuestion = {
    text: "How do you handle flaky tests in CI?",
    difficulty: "hard",
    importance: "core",
    expected: "Investigates root cause rather than retrying blindly.",
    strong: null,
    acceptable: null,
    concepts: ["flakiness", "CI vs local"],
    redFlags: ["Immediately suggests retry-until-pass"],
    followUps: ["How would you quantify flakiness across the suite?"],
    rubric: ["0 - no strategy", "5 - systematic investigation"],
    code: null,
    solution: null,
  };

  const validDraft = {
    competencies: [
      {
        name: "Programming",
        weight: 60,
        critical: true,
        expectedDepth: "Explains WHY, not just HOW.",
        blueprint: { coverage: "core language + testing", questionTypeMix: "2 practical / 1 debugging" },
        questions: [validQuestion],
      },
      {
        name: "SQL",
        weight: 40,
        critical: false,
        expectedDepth: "Writes correct joins and explains query plans.",
        blueprint: { coverage: "joins, indexing", questionTypeMix: "1 practical" },
        questions: [validQuestion],
      },
    ],
    mandatoryRequirements: [{ label: "Work authorization", description: null }],
  };

  it("accepts a well-formed draft", () => {
    const result = templateDraftSchema.safeParse(validDraft);
    expect(result.success).toBe(true);
  });

  // Phase 16/§41 Task 16.5: jdRequirementTag/altSolutions are new, optional
  // question fields (the artifact's "JD: <requirement>" tag and its "other
  // valid approaches" note) — must default to null when a provider omits
  // them, and accept a real value when one is given.
  it("defaults jdRequirementTag/altSolutions to null when omitted", () => {
    const result = templateDraftSchema.safeParse(validDraft);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.competencies[0].questions[0].jdRequirementTag).toBeNull();
      expect(result.data.competencies[0].questions[0].altSolutions).toBeNull();
    }
  });

  it("accepts an explicit jdRequirementTag/altSolutions value", () => {
    const result = templateDraftSchema.safeParse({
      ...validDraft,
      competencies: [
        {
          ...validDraft.competencies[0],
          questions: [
            { ...validQuestion, jdRequirementTag: "API Testing", altSolutions: "Also valid with a Set." },
          ],
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.competencies[0].questions[0].jdRequirementTag).toBe("API Testing");
      expect(result.data.competencies[0].questions[0].altSolutions).toBe("Also valid with a Set.");
    }
  });

  it("defaults an omitted mandatoryRequirements list to an empty array", () => {
    const { mandatoryRequirements: _mr, ...withoutRequirements } = validDraft;
    const result = templateDraftSchema.safeParse(withoutRequirements);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.mandatoryRequirements).toEqual([]);
  });

  it("rejects a draft with zero competencies", () => {
    expect(
      templateDraftSchema.safeParse({ ...validDraft, competencies: [] }).success
    ).toBe(false);
  });

  it("rejects a competency with zero questions", () => {
    const result = templateDraftSchema.safeParse({
      ...validDraft,
      competencies: [{ ...validDraft.competencies[0], questions: [] }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid difficulty value", () => {
    const result = templateDraftSchema.safeParse({
      ...validDraft,
      competencies: [
        {
          ...validDraft.competencies[0],
          questions: [{ ...validQuestion, difficulty: "impossible" }],
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  // §40.4: AI-generated content previously had no length caps at all, while
  // the human-authored form schemas (templates/schemas.ts) did — an AI
  // response that happened to exceed those caps saved fine on generation
  // but then failed the first time a human edited it through the form.
  it("§40.4: rejects a competency name over the 200-char bound the form schema also enforces", () => {
    const result = templateDraftSchema.safeParse({
      ...validDraft,
      competencies: [{ ...validDraft.competencies[0], name: "x".repeat(201) }],
    });
    expect(result.success).toBe(false);
  });

  it("§40.4: rejects a rubric with more than 30 lines, matching the form schema's cap", () => {
    const result = templateDraftSchema.safeParse({
      ...validDraft,
      competencies: [
        {
          ...validDraft.competencies[0],
          questions: [{ ...validQuestion, rubric: Array.from({ length: 31 }, (_, i) => `line ${i}`) }],
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("defaults omitted optional question fields to empty arrays / null", () => {
    const minimalQuestion = {
      text: "What is a Page Object?",
      difficulty: "easy",
      importance: "core",
    };
    const result = templateDraftSchema.safeParse({
      ...validDraft,
      competencies: [{ ...validDraft.competencies[0], questions: [minimalQuestion] }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      const q = result.data.competencies[0].questions[0];
      expect(q.concepts).toEqual([]);
      expect(q.expected).toBeNull();
    }
  });
});
