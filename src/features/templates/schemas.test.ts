import { describe, expect, it } from "vitest";
import { INTERVIEW_STAGES } from "@/domain/interviews/stage-config";
import {
  competencyFormSchema,
  mandatoryRequirementFormSchema,
  questionFormSchema,
  scoringConfigFormSchema,
  templateFormSchema,
} from "./schemas";

describe("templateFormSchema", () => {
  it("requires positionId, a valid stage, and a name", () => {
    expect(templateFormSchema.safeParse({}).success).toBe(false);
    expect(
      templateFormSchema.safeParse({
        positionId: "p1",
        stage: "technical",
        name: "",
      }).success
    ).toBe(false);
    expect(
      templateFormSchema.safeParse({
        positionId: "p1",
        stage: "not-a-stage",
        name: "Backend — Technical Interview",
      }).success
    ).toBe(false);
  });

  it("accepts every stage the domain layer defines", () => {
    for (const stage of INTERVIEW_STAGES) {
      const result = templateFormSchema.safeParse({
        positionId: "p1",
        stage,
        name: "Backend — Interview",
      });
      expect(result.success).toBe(true);
    }
  });
});

describe("scoringConfigFormSchema", () => {
  it("rejects a borderlineMin above the passThreshold", () => {
    const result = scoringConfigFormSchema.safeParse({
      passThreshold: 60,
      borderlineMin: 70,
      criticalMin: 50,
      minCompletion: 70,
    });
    expect(result.success).toBe(false);
  });

  it("accepts a consistent configuration and coerces string inputs (form data)", () => {
    const result = scoringConfigFormSchema.safeParse({
      passThreshold: "70",
      borderlineMin: "50",
      criticalMin: "50",
      minCompletion: "70",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.passThreshold).toBe(70);
    }
  });
});

describe("competencyFormSchema", () => {
  it("treats an absent checkbox field as false, not an error", () => {
    const result = competencyFormSchema.safeParse({
      name: "Programming",
      weight: "60",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.critical).toBe(false);
  });

  it("treats a checked checkbox ('on') as true", () => {
    const result = competencyFormSchema.safeParse({
      name: "Programming",
      weight: "60",
      critical: "on",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.critical).toBe(true);
  });

  it("rejects a weight outside 0-100", () => {
    expect(
      competencyFormSchema.safeParse({ name: "x", weight: "150" }).success
    ).toBe(false);
    expect(
      competencyFormSchema.safeParse({ name: "x", weight: "-5" }).success
    ).toBe(false);
  });
});

describe("mandatoryRequirementFormSchema", () => {
  it("requires a label", () => {
    expect(mandatoryRequirementFormSchema.safeParse({ label: "" }).success).toBe(
      false
    );
    expect(
      mandatoryRequirementFormSchema.safeParse({ label: "Work authorization" })
        .success
    ).toBe(true);
  });
});

describe("questionFormSchema", () => {
  const base = {
    competencyId: "c1",
    text: "How do you handle flaky tests?",
    difficulty: "hard",
    importance: "core",
  };

  it("requires competencyId, text, difficulty, and importance", () => {
    expect(questionFormSchema.safeParse({}).success).toBe(false);
    expect(questionFormSchema.safeParse(base).success).toBe(true);
  });

  it("parses newline-separated text into arrays, dropping blank lines", () => {
    const result = questionFormSchema.safeParse({
      ...base,
      concepts: "flakiness\n\nCI vs local\n",
      rubric: "0 - no strategy\n5 - systematic investigation",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.concepts).toEqual(["flakiness", "CI vs local"]);
      expect(result.data.rubric).toEqual([
        "0 - no strategy",
        "5 - systematic investigation",
      ]);
      expect(result.data.redFlags).toEqual([]);
    }
  });

  it("rejects an invalid difficulty or importance value", () => {
    expect(
      questionFormSchema.safeParse({ ...base, difficulty: "impossible" }).success
    ).toBe(false);
    expect(
      questionFormSchema.safeParse({ ...base, importance: "vital" }).success
    ).toBe(false);
  });
});
