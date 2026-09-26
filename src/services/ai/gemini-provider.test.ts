import { describe, expect, it, vi } from "vitest";
import { AIValidationError } from "./types";

const generateContentMock = vi.fn();

vi.mock("@google/genai", async () => {
  const actual = await vi.importActual<typeof import("@google/genai")>("@google/genai");
  return {
    ...actual,
    GoogleGenAI: class MockGoogleGenAI {
      models = { generateContent: generateContentMock };
    },
  };
});

const { GeminiProvider } = await import("./gemini-provider");

function functionCallResponse(name: string, args: unknown) {
  return { functionCalls: [{ name, args }] };
}

const baseInput = {
  positionTitle: "Senior Backend Developer",
  roleFamily: "Software Engineering",
  seniority: "Senior",
  stage: "technical" as const,
  jobDescriptionText: "We are looking for a Senior Backend Developer...",
  interviewLanguage: "en" as const,
};

describe("GeminiProvider model fallback", () => {
  // Regression test — see the identical note in claude-provider.test.ts.
  // This is the exact bug a real GEMINI_MODEL= (blank) caused live: the SDK
  // rejected the request with "model is required and must be a string".
  it("falls back to the default model when options.model is an empty string", () => {
    const provider = new GeminiProvider({ apiKey: "test-key", model: "" });
    expect(provider.model).toBe("gemini-flash-lite-latest");
  });

  it("uses an explicitly provided model", () => {
    const provider = new GeminiProvider({ apiKey: "test-key", model: "gemini-2.5-pro" });
    expect(provider.model).toBe("gemini-2.5-pro");
  });
});

describe("GeminiProvider.analyzeJobDescription", () => {
  it("parses and returns a valid function-call response", async () => {
    generateContentMock.mockResolvedValueOnce(
      functionCallResponse("submit_job_analysis", {
        detectedRoleFamily: "Software Engineering",
        detectedSeniority: "Mid-Level",
        mandatoryRequirements: ["5+ years backend experience"],
        preferredRequirements: [],
        optionalRequirements: [],
        notes: "Reads as mid-level despite the Senior title.",
      })
    );

    const provider = new GeminiProvider({ apiKey: "test-key" });
    const result = await provider.analyzeJobDescription(baseInput);

    expect(result.detectedSeniority).toBe("Mid-Level");
    expect(generateContentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          toolConfig: {
            functionCallingConfig: {
              mode: "ANY",
              allowedFunctionNames: ["submit_job_analysis"],
            },
          },
        }),
      })
    );
  });

  it("throws AIValidationError with the raw args when validation fails", async () => {
    generateContentMock.mockResolvedValueOnce(
      functionCallResponse("submit_job_analysis", {
        detectedRoleFamily: "Software Engineering",
        mandatoryRequirements: "not an array",
        preferredRequirements: [],
        optionalRequirements: [],
        notes: "x",
      })
    );

    const provider = new GeminiProvider({ apiKey: "test-key" });
    await expect(provider.analyzeJobDescription(baseInput)).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(AIValidationError);
      expect((error as InstanceType<typeof AIValidationError>).rawOutput).toMatchObject({
        mandatoryRequirements: "not an array",
      });
      return true;
    });
  });

  it("throws a plain error when the response has no matching function call", async () => {
    generateContentMock.mockResolvedValueOnce({ functionCalls: undefined });

    const provider = new GeminiProvider({ apiKey: "test-key" });
    await expect(provider.analyzeJobDescription(baseInput)).rejects.toThrow(/unexpected response/);
  });
});

describe("GeminiProvider.generateTemplateDraft", () => {
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
    generateContentMock.mockResolvedValueOnce(
      functionCallResponse("submit_template_draft", {
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

    const provider = new GeminiProvider({ apiKey: "test-key" });
    const draft = await provider.generateTemplateDraft(draftInput);

    expect(draft.competencies).toHaveLength(1);
    expect(draft.competencies[0].questions[0].text).toBe("How do you handle flaky tests?");
  });

  it("throws AIValidationError when a competency has zero questions", async () => {
    generateContentMock.mockResolvedValueOnce(
      functionCallResponse("submit_template_draft", {
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

    const provider = new GeminiProvider({ apiKey: "test-key" });
    await expect(provider.generateTemplateDraft(draftInput)).rejects.toBeInstanceOf(
      AIValidationError
    );
  });
});

describe("GeminiProvider.regenerateQuestion", () => {
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
    generateContentMock.mockResolvedValueOnce(
      functionCallResponse("submit_regenerated_question", {
        text: "Walk through diagnosing a memory leak in a long-running service.",
        difficulty: "hard",
        importance: "core",
        concepts: ["heap profiling"],
        redFlags: [],
        followUps: [],
        rubric: [],
      })
    );

    const provider = new GeminiProvider({ apiKey: "test-key" });
    const question = await provider.regenerateQuestion(regenerateInput);

    expect(question.text).toBe(
      "Walk through diagnosing a memory leak in a long-running service."
    );
  });

  it("works with no Job Description grounding (jobDescriptionText: null)", async () => {
    generateContentMock.mockResolvedValueOnce(
      functionCallResponse("submit_regenerated_question", {
        text: "Explain a time you optimized a slow SQL query.",
        difficulty: "medium",
        importance: "core",
        concepts: [],
        redFlags: [],
        followUps: [],
        rubric: [],
      })
    );

    const provider = new GeminiProvider({ apiKey: "test-key" });
    const question = await provider.regenerateQuestion({
      ...regenerateInput,
      jobDescriptionText: null,
    });

    expect(question.text).toBe("Explain a time you optimized a slow SQL query.");
  });

  it("throws AIValidationError when the response fails validation", async () => {
    generateContentMock.mockResolvedValueOnce(
      functionCallResponse("submit_regenerated_question", {
        text: "",
        difficulty: "hard",
        importance: "core",
        concepts: [],
        redFlags: [],
        followUps: [],
        rubric: [],
      })
    );

    const provider = new GeminiProvider({ apiKey: "test-key" });
    await expect(provider.regenerateQuestion(regenerateInput)).rejects.toBeInstanceOf(
      AIValidationError
    );
  });
});
