import { describe, expect, it, vi } from "vitest";
import { AIValidationError } from "./types";

const createMock = vi.fn();

vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = { create: createMock };
  },
}));

// Imported after the mock so the class picks up the mocked constructor.
const { ClaudeProvider } = await import("./claude-provider");

function toolUseResponse(input: unknown) {
  return { content: [{ type: "tool_use", id: "t1", name: "x", input }] };
}

const baseInput = {
  positionTitle: "Senior Backend Developer",
  roleFamily: "Software Engineering",
  seniority: "Senior",
  stage: "technical" as const,
  jobDescriptionText: "We are looking for a Senior Backend Developer...",
};

describe("ClaudeProvider.analyzeJobDescription", () => {
  it("parses and returns a valid tool_use response", async () => {
    createMock.mockResolvedValueOnce(
      toolUseResponse({
        detectedRoleFamily: "Software Engineering",
        detectedSeniority: "Mid-Level",
        mandatoryRequirements: ["5+ years backend experience"],
        preferredRequirements: [],
        optionalRequirements: [],
        notes: "Reads as mid-level despite the Senior title.",
      })
    );

    const provider = new ClaudeProvider({ apiKey: "test-key" });
    const result = await provider.analyzeJobDescription(baseInput);

    expect(result.detectedSeniority).toBe("Mid-Level");
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tool_choice: { type: "tool", name: "submit_job_analysis" },
      })
    );
  });

  it("throws AIValidationError with the raw output when validation fails", async () => {
    createMock.mockResolvedValueOnce(
      toolUseResponse({
        detectedRoleFamily: "Software Engineering",
        // detectedSeniority missing entirely — invalid
        mandatoryRequirements: "not an array",
        preferredRequirements: [],
        optionalRequirements: [],
        notes: "x",
      })
    );

    const provider = new ClaudeProvider({ apiKey: "test-key" });
    await expect(provider.analyzeJobDescription(baseInput)).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(AIValidationError);
      expect((error as InstanceType<typeof AIValidationError>).rawOutput).toMatchObject({
        mandatoryRequirements: "not an array",
      });
      return true;
    });
  });

  it("throws a plain error when the response has no tool_use block", async () => {
    createMock.mockResolvedValueOnce({ content: [{ type: "text", text: "sorry, I can't." }] });

    const provider = new ClaudeProvider({ apiKey: "test-key" });
    await expect(provider.analyzeJobDescription(baseInput)).rejects.toThrow(/did not include/);
  });
});

describe("ClaudeProvider.generateTemplateDraft", () => {
  const draftInput = {
    ...baseInput,
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

  it("parses and returns a valid template draft", async () => {
    createMock.mockResolvedValueOnce(
      toolUseResponse({
        competencies: [
          {
            name: "Programming",
            weight: 100,
            critical: true,
            expectedDepth: "Explains WHY, not just HOW.",
            blueprint: { coverage: "core language", questionTypeMix: "1 practical" },
            questions: [
              {
                text: "How do you handle flaky tests?",
                difficulty: "hard",
                importance: "core",
                concepts: [],
                redFlags: [],
                followUps: [],
                rubric: [],
              },
            ],
          },
        ],
        mandatoryRequirements: [],
      })
    );

    const provider = new ClaudeProvider({ apiKey: "test-key" });
    const draft = await provider.generateTemplateDraft(draftInput);

    expect(draft.competencies).toHaveLength(1);
    expect(draft.competencies[0].questions[0].text).toBe("How do you handle flaky tests?");
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tool_choice: { type: "tool", name: "submit_template_draft" },
      })
    );
  });

  it("throws AIValidationError when a competency has zero questions", async () => {
    createMock.mockResolvedValueOnce(
      toolUseResponse({
        competencies: [
          {
            name: "Programming",
            weight: 100,
            critical: true,
            expectedDepth: "x",
            blueprint: { coverage: "x", questionTypeMix: "x" },
            questions: [],
          },
        ],
        mandatoryRequirements: [],
      })
    );

    const provider = new ClaudeProvider({ apiKey: "test-key" });
    await expect(provider.generateTemplateDraft(draftInput)).rejects.toBeInstanceOf(
      AIValidationError
    );
  });
});
