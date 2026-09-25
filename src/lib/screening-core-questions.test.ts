import { describe, expect, it } from "vitest";
import { templateDraftSchema } from "@/services/ai/schemas";
import { buildCoreScreeningCompetency, buildWorkAuthorizationRequirement } from "./screening-core-questions";

// Plan Phase 22/§43.13: the curated core First Screening competency is
// merged into a draft programmatically (not AI-generated) — these tests
// guard its shape against drifting out of sync with the schema it must
// satisfy, and confirm the compensation question is genuinely opt-in.
describe("buildCoreScreeningCompetency", () => {
  it("produces a competency that validates against the shared draft-question schema", () => {
    const competency = buildCoreScreeningCompetency({ includeCompensationQuestion: false });
    const result = templateDraftSchema.safeParse({
      competencies: [competency],
      mandatoryRequirements: [],
    });
    expect(result.success).toBe(true);
  });

  it("is not critical and every question is non-technical", () => {
    const competency = buildCoreScreeningCompetency({ includeCompensationQuestion: true });
    expect(competency.critical).toBe(false);
    for (const question of competency.questions) {
      expect(question.requiresTechnicalKnowledge).toBe(false);
    }
  });

  it("omits the compensation question by default", () => {
    const competency = buildCoreScreeningCompetency({ includeCompensationQuestion: false });
    expect(competency.questions.some((q) => q.text.toLowerCase().includes("compensation"))).toBe(false);
  });

  it("includes the compensation question only when explicitly opted in", () => {
    const competency = buildCoreScreeningCompetency({ includeCompensationQuestion: true });
    expect(competency.questions.some((q) => q.text.toLowerCase().includes("compensation"))).toBe(true);
  });

  it("always includes the standard candidate-questions closer", () => {
    const competency = buildCoreScreeningCompetency({ includeCompensationQuestion: false });
    expect(
      competency.questions.some((q) => q.text.toLowerCase().includes("questions do you have"))
    ).toBe(true);
  });
});

describe("buildWorkAuthorizationRequirement", () => {
  it("is a plain label/description pair, not a scored competency", () => {
    const requirement = buildWorkAuthorizationRequirement();
    expect(requirement.label).toBe("Work Authorization");
    expect(typeof requirement.description).toBe("string");
  });
});
