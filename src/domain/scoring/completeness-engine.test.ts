import { describe, expect, it } from "vitest";
import { calculateCompleteness } from "./completeness-engine";
import type { QuestionEvaluationInput } from "./types";

describe("calculateCompleteness", () => {
  it("returns 0% completion when there are no questions at all", () => {
    expect(calculateCompleteness([])).toEqual({
      totalApplicable: 0,
      totalEvaluated: 0,
      completion: 0,
    });
  });

  it("counts an unrated (null) question toward applicable but not evaluated", () => {
    const evaluations: QuestionEvaluationInput[] = [
      { competencyId: "a", score: null },
    ];
    expect(calculateCompleteness(evaluations)).toEqual({
      totalApplicable: 1,
      totalEvaluated: 0,
      completion: 0,
    });
  });

  it("counts an explicit score of 0 as evaluated, not as unrated", () => {
    const evaluations: QuestionEvaluationInput[] = [
      { competencyId: "a", score: 0 },
    ];
    expect(calculateCompleteness(evaluations)).toEqual({
      totalApplicable: 1,
      totalEvaluated: 1,
      completion: 100,
    });
  });

  it("excludes N/A questions from both applicable and evaluated", () => {
    const evaluations: QuestionEvaluationInput[] = [
      { competencyId: "a", score: "na" },
      { competencyId: "a", score: 4 },
    ];
    expect(calculateCompleteness(evaluations)).toEqual({
      totalApplicable: 1,
      totalEvaluated: 1,
      completion: 100,
    });
  });

  it("distinguishes unrated, rated-0, and N/A when mixed together", () => {
    const evaluations: QuestionEvaluationInput[] = [
      { competencyId: "a", score: null }, // unrated: applicable, not evaluated
      { competencyId: "a", score: 0 }, // rated 0: applicable AND evaluated
      { competencyId: "a", score: "na" }, // na: neither
      { competencyId: "a", score: 3 }, // rated: applicable AND evaluated
    ];
    expect(calculateCompleteness(evaluations)).toEqual({
      totalApplicable: 3,
      totalEvaluated: 2,
      completion: (2 / 3) * 100,
    });
  });
});
