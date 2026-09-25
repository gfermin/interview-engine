// @vitest-environment node
//
// §40.5 item 5: ai-actions.ts had zero test coverage, including the §40.2
// error-to-plain-message mapping this session added (describeAIError) — the
// most important thing to verify here, since a raw SDK exception reaching
// the interviewer verbatim was exactly the finding being fixed.
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { competencies, positions, questions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { saveJobDescription } from "@/features/positions/job-description";
import type { InterviewStage } from "@/domain/interviews/stage-config";
import { AIValidationError } from "@/services/ai/types";
import type { TemplateDraft } from "@/services/ai/schemas";
import { createTemplate, saveJobAnalysis, updateScoringConfig } from "./mutations";
import { analyzeJobDescriptionAction, generateTemplateDraftAction } from "./ai-actions";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const analyzeJobDescriptionMock = vi.hoisted(() => vi.fn());
const generateTemplateDraftMock = vi.hoisted(() => vi.fn());
vi.mock("@/services/ai/provider", () => ({
  getAIProvider: () => ({
    providerName: "anthropic",
    model: "claude-sonnet-5",
    analyzeJobDescription: analyzeJobDescriptionMock,
    generateTemplateDraft: generateTemplateDraftMock,
  }),
}));

beforeEach(() => {
  vi.mocked(revalidatePath).mockClear();
  analyzeJobDescriptionMock.mockReset();
  generateTemplateDraftMock.mockReset();
});

async function createTemplateWithJobDescription(stage: InterviewStage = "technical") {
  const [position] = await db
    .insert(positions)
    .values({ title: `Test Position ${randomUUID()}` })
    .returning();
  const jobDescription = await saveJobDescription(position.id, "We are looking for a Senior Backend Developer...");
  return createTemplate({ positionId: position.id, jobDescriptionId: jobDescription.id, stage, name: "T", interviewLanguage: "en" });
}

/** A minimal, schema-valid AI draft with one role-specific competency —
 * enough to exercise the screening core-content merge (plan Phase 22/§43.13)
 * without needing a real AI call. */
const AI_DRAFT: TemplateDraft = {
  competencies: [
    {
      name: "Cloud Experience",
      weight: 100,
      critical: false,
      expectedDepth: "Has used a major cloud provider professionally.",
      blueprint: { coverage: "AWS usage", questionTypeMix: "1 evidence question" },
      questions: [
        {
          text: "Have you used AWS professionally, and for how long?",
          difficulty: "easy",
          importance: "core",
          expected: null,
          strong: null,
          acceptable: null,
          concepts: [],
          redFlags: [],
          followUps: [],
          rubric: [],
          code: null,
          solution: null,
          jdRequirementTag: "AWS",
          altSolutions: null,
          requiresTechnicalKnowledge: false,
          technicalTermHelper: null,
        },
      ],
    },
  ],
  mandatoryRequirements: [],
};

describe("analyzeJobDescriptionAction error mapping (§40.2)", () => {
  it("maps a 401 status to a plain 'API key' message", async () => {
    const template = await createTemplateWithJobDescription();
    analyzeJobDescriptionMock.mockRejectedValueOnce(Object.assign(new Error("Unauthorized"), { status: 401 }));

    const result = await analyzeJobDescriptionAction(template.id, undefined);

    expect(result?.error).toBe("AI provider rejected the API key — check it in your .env file.");
  });

  it("maps a 429 status to a plain rate-limit message", async () => {
    const template = await createTemplateWithJobDescription();
    analyzeJobDescriptionMock.mockRejectedValueOnce(Object.assign(new Error("Too Many Requests"), { status: 429 }));

    const result = await analyzeJobDescriptionAction(template.id, undefined);

    expect(result?.error).toBe("Rate limited by the AI provider — try again shortly.");
  });

  it("maps a 5xx status to a plain 'temporarily unavailable' message", async () => {
    const template = await createTemplateWithJobDescription();
    analyzeJobDescriptionMock.mockRejectedValueOnce(Object.assign(new Error("Bad Gateway"), { status: 502 }));

    const result = await analyzeJobDescriptionAction(template.id, undefined);

    expect(result?.error).toBe("The AI provider is temporarily unavailable — try again shortly.");
  });

  it("maps a network-level failure to a plain connectivity message", async () => {
    const template = await createTemplateWithJobDescription();
    analyzeJobDescriptionMock.mockRejectedValueOnce(new Error("fetch failed: ECONNREFUSED"));

    const result = await analyzeJobDescriptionAction(template.id, undefined);

    expect(result?.error).toBe("Couldn't reach the AI provider — check your network connection and try again.");
  });

  it("passes an AIValidationError's message and raw output through unchanged (plan §28)", async () => {
    const template = await createTemplateWithJobDescription();
    const rawOutput = { notes: "x", mandatoryRequirements: "not an array" };
    analyzeJobDescriptionMock.mockRejectedValueOnce(
      new AIValidationError("AI job analysis output failed validation: mandatoryRequirements: Invalid input", rawOutput)
    );

    const result = await analyzeJobDescriptionAction(template.id, undefined);

    expect(result?.error).toBe("AI job analysis output failed validation: mandatoryRequirements: Invalid input");
    expect(result?.rawOutput).toBe(JSON.stringify(rawOutput, null, 2));
  });

  it("falls back to the error's own message for anything unrecognized", async () => {
    const template = await createTemplateWithJobDescription();
    analyzeJobDescriptionMock.mockRejectedValueOnce(new Error("Something else entirely."));

    const result = await analyzeJobDescriptionAction(template.id, undefined);

    expect(result?.error).toBe("Something else entirely.");
  });

  it("succeeds and revalidates the template page when the provider resolves normally", async () => {
    const template = await createTemplateWithJobDescription();
    analyzeJobDescriptionMock.mockResolvedValueOnce({
      detectedRoleFamily: "Software Engineering",
      detectedSeniority: "Senior",
      mandatoryRequirements: [],
      preferredRequirements: [],
      optionalRequirements: [],
      notes: "",
    });

    const result = await analyzeJobDescriptionAction(template.id, undefined);

    expect(result?.error).toBeUndefined();
    expect(revalidatePath).toHaveBeenCalledWith(`/templates/${template.id}`);
  });
});

// Plan Phase 22/§43.13/§43.14: First Screening merges curated core content
// and opt-in logistics gates into the AI's own draft, and records
// provenance under its own prompt version — none of this applies to a
// Technical Interview draft.
describe("generateTemplateDraftAction — First Screening core-content merge (plan Phase 22)", () => {
  async function jobAnalysisFixture(jobDescriptionId: string) {
    await saveJobAnalysis(jobDescriptionId, {
      detectedRoleFamily: "Software Engineering",
      detectedSeniority: "Senior",
      mandatoryRequirements: [],
      preferredRequirements: [],
      optionalRequirements: [],
      notes: "",
    });
  }

  it("merges the curated core competency ahead of the AI's role-specific competency, weights summing to 100", async () => {
    const template = await createTemplateWithJobDescription("screening");
    await jobAnalysisFixture(template.jobDescriptionId!);
    generateTemplateDraftMock.mockResolvedValueOnce(AI_DRAFT);

    const result = await generateTemplateDraftAction(template.id, undefined);
    expect(result?.error).toBeUndefined();

    const saved = await db.query.competencies.findMany({
      where: eq(competencies.templateId, template.id),
      orderBy: (c, { asc }) => [asc(c.sortOrder)],
    });
    expect(saved.map((c) => c.name)).toEqual(["Background, Motivation & Communication", "Cloud Experience"]);
    expect(saved.reduce((sum, c) => sum + c.weight, 0)).toBe(100);
  });

  it("never generates code exercises for a screening draft even if the AI ignored the instruction", async () => {
    const template = await createTemplateWithJobDescription("screening");
    await jobAnalysisFixture(template.jobDescriptionId!);
    generateTemplateDraftMock.mockResolvedValueOnce({
      ...AI_DRAFT,
      competencies: [{ ...AI_DRAFT.competencies[0], questions: [{ ...AI_DRAFT.competencies[0].questions[0], code: "print(1)", solution: "print(1)" }] }],
    });

    await generateTemplateDraftAction(template.id, undefined);

    const saved = await db.query.questions.findMany({ where: eq(questions.templateId, template.id) });
    for (const q of saved) {
      expect(q.code).toBeNull();
      expect(q.solution).toBeNull();
    }
  });

  it("does not add a Work Authorization requirement unless the template opts in", async () => {
    const template = await createTemplateWithJobDescription("screening");
    await jobAnalysisFixture(template.jobDescriptionId!);
    generateTemplateDraftMock.mockResolvedValueOnce(AI_DRAFT);

    await generateTemplateDraftAction(template.id, undefined);

    const saved = await db.query.mandatoryRequirements.findMany({
      where: (r, { eq: eqOp }) => eqOp(r.templateId, template.id),
    });
    expect(saved).toHaveLength(0);
  });

  it("adds a Work Authorization requirement when the template opts in", async () => {
    const template = await createTemplateWithJobDescription("screening");
    await jobAnalysisFixture(template.jobDescriptionId!);
    await updateScoringConfig(template.id, {
      passThreshold: 70,
      borderlineMin: 50,
      criticalMin: 50,
      minCompletion: 70,
      englishRequired: false,
      englishMinLevel: 3,
      includeCompensationQuestion: false,
      includeWorkAuthorizationCheck: true,
    });
    generateTemplateDraftMock.mockResolvedValueOnce(AI_DRAFT);

    await generateTemplateDraftAction(template.id, undefined);

    const saved = await db.query.mandatoryRequirements.findMany({
      where: (r, { eq: eqOp }) => eqOp(r.templateId, template.id),
    });
    expect(saved.map((r) => r.label)).toEqual(["Work Authorization"]);
  });

  it("includes the compensation question only when the template opts in", async () => {
    const template = await createTemplateWithJobDescription("screening");
    await jobAnalysisFixture(template.jobDescriptionId!);
    await updateScoringConfig(template.id, {
      passThreshold: 70,
      borderlineMin: 50,
      criticalMin: 50,
      minCompletion: 70,
      englishRequired: false,
      englishMinLevel: 3,
      includeCompensationQuestion: true,
      includeWorkAuthorizationCheck: false,
    });
    generateTemplateDraftMock.mockResolvedValueOnce(AI_DRAFT);

    await generateTemplateDraftAction(template.id, undefined);

    const coreCompetency = await db.query.competencies.findFirst({
      where: (c, { and: andOp, eq: eqOp }) =>
        andOp(eqOp(c.templateId, template.id), eqOp(c.name, "Background, Motivation & Communication")),
    });
    const saved = await db.query.questions.findMany({ where: eq(questions.competencyId, coreCompetency!.id) });
    expect(saved.some((q) => q.text.toLowerCase().includes("compensation"))).toBe(true);
  });

  it("does not merge core content or alter mandatory requirements for a Technical Interview draft", async () => {
    const template = await createTemplateWithJobDescription("technical");
    await jobAnalysisFixture(template.jobDescriptionId!);
    generateTemplateDraftMock.mockResolvedValueOnce(AI_DRAFT);

    await generateTemplateDraftAction(template.id, undefined);

    const saved = await db.query.competencies.findMany({ where: eq(competencies.templateId, template.id) });
    expect(saved.map((c) => c.name)).toEqual(["Cloud Experience"]);
  });
});
