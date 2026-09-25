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
import { positions } from "@/db/schema";
import { saveJobDescription } from "@/features/positions/job-description";
import { AIValidationError } from "@/services/ai/types";
import { createTemplate } from "./mutations";
import { analyzeJobDescriptionAction } from "./ai-actions";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const analyzeJobDescriptionMock = vi.hoisted(() => vi.fn());
vi.mock("@/services/ai/provider", () => ({
  getAIProvider: () => ({
    providerName: "anthropic",
    model: "claude-sonnet-5",
    analyzeJobDescription: analyzeJobDescriptionMock,
  }),
}));

beforeEach(() => {
  vi.mocked(revalidatePath).mockClear();
  analyzeJobDescriptionMock.mockReset();
});

async function createTemplateWithJobDescription() {
  const [position] = await db
    .insert(positions)
    .values({ title: `Test Position ${randomUUID()}` })
    .returning();
  const jobDescription = await saveJobDescription(position.id, "We are looking for a Senior Backend Developer...");
  return createTemplate({ positionId: position.id, jobDescriptionId: jobDescription.id, stage: "technical", name: "T", interviewLanguage: "en" });
}

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
