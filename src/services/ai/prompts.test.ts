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

// Plan Phase 22/§43.1/§43.14: First Screening must NOT be "Technical
// Interview with a shorter sentence" — buildTemplateDraftPrompt dispatches
// to a wholly distinct builder for the screening stage rather than
// threading a stage flag into one shared prompt.
describe("buildTemplateDraftPrompt (stage dispatch, plan Phase 22/§43)", () => {
  const screeningInput = { ...baseDraftInput, stage: "screening" as const, includeCodeExercises: false };

  it("uses HR/recruiter-persona instructions for the screening stage, not the technical builder's", () => {
    const { system } = buildTemplateDraftPrompt({ ...screeningInput, interviewLanguage: "en" });
    expect(system).toMatch(/HR\/recruiting professional/);
    expect(system).toMatch(/NOT to technically certify the candidate/);
    expect(system).not.toMatch(/This is a full Technical Interview\./);
  });

  it("explicitly bans deep technical question types for the screening stage", () => {
    const { system } = buildTemplateDraftPrompt({ ...screeningInput, interviewLanguage: "en" });
    expect(system).toMatch(/DO NOT generate: coding questions/);
    expect(system).toMatch(/system design questions/);
    expect(system).toMatch(/deep architecture questions/);
  });

  it("instructs an evidence-tier pattern and a technical-term helper, unique to screening", () => {
    const { system } = buildTemplateDraftPrompt({ ...screeningInput, interviewLanguage: "en" });
    expect(system).toMatch(/HIGH-LEVEL EXPERIENCE VALIDATION pattern/);
    expect(system).toMatch(/'technicalTermHelper'/);
    expect(system).toMatch(/'requiresTechnicalKnowledge'/);
  });

  it("tells the model not to duplicate the platform's curated core content", () => {
    const { system } = buildTemplateDraftPrompt({ ...screeningInput, interviewLanguage: "en" });
    expect(system).toMatch(/do not duplicate introduction, motivation, availability/);
  });

  it("still forwards interviewLanguage for the screening stage", () => {
    const en = buildTemplateDraftPrompt({ ...screeningInput, interviewLanguage: "en" });
    expect(en.system).toMatch(/entirely in English/);
    const es = buildTemplateDraftPrompt({ ...screeningInput, interviewLanguage: "es" });
    expect(es.system).toMatch(/entirely in Spanish/);
  });

  it("keeps the technical-stage prompt unaffected by the screening builder's existence", () => {
    const { system } = buildTemplateDraftPrompt({ ...baseDraftInput, interviewLanguage: "en" });
    expect(system).toMatch(/full Technical Interview/);
    expect(system).not.toMatch(/HR\/recruiting professional/);
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
