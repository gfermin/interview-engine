import { describe, expect, it } from "vitest";
import { buildJobAnalysisPrompt, buildRegenerateQuestionPrompt, buildTemplateDraftPrompt } from "./prompts";

const baseAnalysisInput = {
  positionTitle: "Senior Backend Developer",
  roleFamily: "Software Engineering",
  seniority: "Senior",
  stage: "technical" as const,
  jobDescriptionText: "We are looking for a Senior Backend Developer...",
};

const baseDraftInput = {
  ...baseAnalysisInput,
  jobAnalysis: {
    detectedRoleFamily: "Software Engineering",
    detectedSeniority: "Senior",
    mandatoryRequirements: [],
    preferredRequirements: [],
    optionalRequirements: [],
    notes: "",
  },
  includeCodeExercises: true,
};

const baseRegenerateInput = {
  ...baseAnalysisInput,
  competencyName: "Programming",
  competencyExpectedDepth: "Explains WHY, not just HOW.",
  existingQuestion: {
    text: "How do you handle flaky tests?",
    difficulty: "hard" as const,
    importance: "core" as const,
  },
  includeCodeExercises: true,
};

// Plan Phase 21/§24: the AI generation request must explicitly state the
// interview content language rather than let the model guess it from the
// JD text — these tests confirm `interviewLanguage` actually reaches the
// constructed prompt, for all three generation entry points.
describe("buildJobAnalysisPrompt", () => {
  it("instructs English content for interviewLanguage 'en'", () => {
    const { system } = buildJobAnalysisPrompt({ ...baseAnalysisInput, interviewLanguage: "en" });
    expect(system).toMatch(/entirely in English/);
  });

  it("instructs Spanish content for interviewLanguage 'es'", () => {
    const { system } = buildJobAnalysisPrompt({ ...baseAnalysisInput, interviewLanguage: "es" });
    expect(system).toMatch(/entirely in Spanish/);
  });
});

describe("buildTemplateDraftPrompt", () => {
  it("instructs English content for interviewLanguage 'en'", () => {
    const { system } = buildTemplateDraftPrompt({ ...baseDraftInput, interviewLanguage: "en" });
    expect(system).toMatch(/entirely in English/);
  });

  it("instructs Spanish content for interviewLanguage 'es'", () => {
    const { system } = buildTemplateDraftPrompt({ ...baseDraftInput, interviewLanguage: "es" });
    expect(system).toMatch(/entirely in Spanish/);
  });
});

describe("buildRegenerateQuestionPrompt", () => {
  it("instructs English content for interviewLanguage 'en'", () => {
    const { system } = buildRegenerateQuestionPrompt({ ...baseRegenerateInput, interviewLanguage: "en" });
    expect(system).toMatch(/entirely in English/);
  });

  it("instructs Spanish content for interviewLanguage 'es'", () => {
    const { system } = buildRegenerateQuestionPrompt({ ...baseRegenerateInput, interviewLanguage: "es" });
    expect(system).toMatch(/entirely in Spanish/);
  });
});
