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

describe("ClaudeProvider model fallback", () => {
  // Regression test: an env var declared but left blank in .env
  // (`ANTHROPIC_MODEL=`) comes through as `""`, not `undefined` — `??`
  // doesn't catch that, so the constructor previously sent an empty model
  // string to the API. Found via a real Gemini-side failure ("model is
  // required and must be a string") with the equivalent GEMINI_MODEL=.
  it("falls back to the default model when options.model is an empty string", () => {
    const provider = new ClaudeProvider({ apiKey: "test-key", model: "" });
    expect(provider.model).toBe("claude-sonnet-5");
  });

  it("uses an explicitly provided model", () => {
    const provider = new ClaudeProvider({ apiKey: "test-key", model: "claude-opus-5" });
    expect(provider.model).toBe("claude-opus-5");
  });
});

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
    await expect(provider.analyzeJobDescription(baseInput)).rejects.toThrow(/unexpected response/);
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

describe("ClaudeProvider.regenerateQuestion", () => {
  const regenerateInput = {
    ...baseInput,
    competencyName: "Programming",
    competencyExpectedDepth: "Explains WHY, not just HOW.",
    existingQuestion: {
      text: "How do you handle flaky tests?",
      difficulty: "hard" as const,
      importance: "core" as const,
    },
    includeCodeExercises: true,
  };

  it("parses and returns a single replacement question", async () => {
    createMock.mockResolvedValueOnce(
      toolUseResponse({
        text: "Walk through diagnosing a memory leak in a long-running service.",
        difficulty: "hard",
        importance: "core",
        concepts: ["heap profiling"],
        redFlags: [],
        followUps: [],
        rubric: [],
      })
    );

    const provider = new ClaudeProvider({ apiKey: "test-key" });
    const question = await provider.regenerateQuestion(regenerateInput);

    expect(question.text).toBe(
      "Walk through diagnosing a memory leak in a long-running service."
    );
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tool_choice: { type: "tool", name: "submit_regenerated_question" },
      })
    );
  });

  it("works with no Job Description grounding (jobDescriptionText: null)", async () => {
    createMock.mockResolvedValueOnce(
      toolUseResponse({
        text: "Explain a time you optimized a slow SQL query.",
        difficulty: "medium",
        importance: "core",
        concepts: [],
        redFlags: [],
        followUps: [],
        rubric: [],
      })
    );

    const provider = new ClaudeProvider({ apiKey: "test-key" });
    const question = await provider.regenerateQuestion({
      ...regenerateInput,
      jobDescriptionText: null,
    });

    expect(question.text).toBe("Explain a time you optimized a slow SQL query.");
  });

  it("throws AIValidationError when the response fails validation", async () => {
    createMock.mockResolvedValueOnce(
      toolUseResponse({
        text: "",
        difficulty: "hard",
        importance: "core",
        concepts: [],
        redFlags: [],
        followUps: [],
        rubric: [],
      })
    );

    const provider = new ClaudeProvider({ apiKey: "test-key" });
    await expect(provider.regenerateQuestion(regenerateInput)).rejects.toBeInstanceOf(
      AIValidationError
    );
  });
});
