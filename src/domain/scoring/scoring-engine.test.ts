import { describe, expect, it } from "vitest";
import { calculate, calculateCompetencyStats, calculateOverall } from "./scoring-engine";
import {
  DEFAULT_SCORING_CONFIG,
  type CalculateScoringInput,
  type Competency,
} from "./types";

function baseInput(
  overrides: Partial<CalculateScoringInput> = {}
): CalculateScoringInput {
  return {
    competencies: [],
    questionEvaluations: [],
    mandatoryRequirements: [],
    mandatoryRequirementEvaluations: [],
    config: DEFAULT_SCORING_CONFIG,
    ...overrides,
  };
}

describe("calculateCompetencyStats", () => {
  it("computes percent as the average PCT over evaluated questions only", () => {
    const competencies: Competency[] = [{ id: "a", weight: 100, critical: false }];
    const stats = calculateCompetencyStats(competencies, [
      { competencyId: "a", score: 3 }, // 60
      { competencyId: "a", score: 4 }, // 80
      { competencyId: "a", score: "na" }, // excluded
      { competencyId: "a", score: null }, // not counted here (completeness's job)
    ]);
    expect(stats.get("a")).toEqual({
      competencyId: "a",
      evaluated: 2,
      na: 1,
      percent: 70, // (60 + 80) / 2
    });
  });

  it("a competency with zero evaluated questions has a null percent, not zero", () => {
    const competencies: Competency[] = [{ id: "a", weight: 100, critical: false }];
    const stats = calculateCompetencyStats(competencies, []);
    expect(stats.get("a")?.percent).toBeNull();
  });
});

describe("calculateOverall", () => {
  it("renormalizes weights over only the competencies with evidence", () => {
    const competencies: Competency[] = [
      { id: "a", weight: 50, critical: false },
      { id: "b", weight: 50, critical: false },
    ];
    // Only "a" has evidence; "b"'s weight must not silently count against
    // the candidate by treating its missing percent as 0.
    const stats = calculateCompetencyStats(competencies, [
      { competencyId: "a", score: 4 }, // 80%
    ]);
    expect(calculateOverall(competencies, stats)).toBe(80);
  });

  it("returns null when no competency has any evidence", () => {
    const competencies: Competency[] = [{ id: "a", weight: 100, critical: false }];
    const stats = calculateCompetencyStats(competencies, []);
    expect(calculateOverall(competencies, stats)).toBeNull();
  });
});

describe("calculate — status precedence", () => {
  it("NOT_EVALUATED when there is no evidence at all", () => {
    const result = calculate(
      baseInput({
        competencies: [{ id: "a", weight: 100, critical: false }],
        questionEvaluations: [{ competencyId: "a", score: null }],
      })
    );
    expect(result.status).toBe("NOT_EVALUATED");
    expect(result.recommendation).toBeNull();
  });

  it("PROVISIONAL when completion is below minCompletion", () => {
    const result = calculate(
      baseInput({
        competencies: [{ id: "a", weight: 100, critical: false }],
        questionEvaluations: [
          { competencyId: "a", score: 5 },
          { competencyId: "a", score: null },
        ], // 1/2 = 50% < 70% minCompletion
      })
    );
    expect(result.status).toBe("PROVISIONAL");
    expect(result.reason).toMatch(/completion/i);
  });

  it("PROVISIONAL when a critical competency has no evidence yet, even if overall completion is high", () => {
    const result = calculate(
      baseInput({
        competencies: [
          { id: "programming", weight: 50, critical: true },
          { id: "sql", weight: 50, critical: false },
        ],
        questionEvaluations: [
          { competencyId: "programming", score: null }, // no evidence
          { competencyId: "sql", score: 5 },
          { competencyId: "sql", score: 5 },
          { competencyId: "sql", score: 5 },
        ], // completion = 3/4 = 75% >= 70%, but programming has 0 evaluated
      })
    );
    expect(result.status).toBe("PROVISIONAL");
    expect(result.reason).toMatch(/critical/i);
  });

  it("PROVISIONAL when a mandatory requirement has not been evaluated yet", () => {
    const result = calculate(
      baseInput({
        competencies: [{ id: "a", weight: 100, critical: false }],
        questionEvaluations: [{ competencyId: "a", score: 5 }],
        mandatoryRequirements: [{ id: "work_authorization" }],
        mandatoryRequirementEvaluations: [], // unknown
      })
    );
    expect(result.status).toBe("PROVISIONAL");
    expect(result.reason).toMatch(/mandatory requirement/i);
  });

  it("FAIL when a critical competency with evidence fails its bar, even overriding a passing overall score", () => {
    const result = calculate(
      baseInput({
        competencies: [
          { id: "programming", weight: 50, critical: true },
          { id: "other", weight: 50, critical: false },
        ],
        questionEvaluations: [
          { competencyId: "programming", score: 2 }, // 40% < criticalMin 50%
          { competencyId: "other", score: 5 }, // 100%
        ], // overall = (40*50 + 100*50) / 100 = 70 -- would otherwise PASS
      })
    );
    expect(result.overall).toBe(70);
    expect(result.status).toBe("FAIL");
    expect(result.reason).toMatch(/critical competency/i);
  });

  it("FAIL when a mandatory requirement is explicitly not met, overriding a perfect overall score", () => {
    const result = calculate(
      baseInput({
        competencies: [{ id: "a", weight: 100, critical: false }],
        questionEvaluations: [{ competencyId: "a", score: 5 }], // overall 100%
        mandatoryRequirements: [{ id: "certification" }],
        mandatoryRequirementEvaluations: [
          { requirementId: "certification", status: "not_met" },
        ],
      })
    );
    expect(result.overall).toBe(100);
    expect(result.status).toBe("FAIL");
    expect(result.reason).toMatch(/mandatory requirement/i);
  });

  it("PASS when overall meets the threshold and a mandatory requirement is explicitly met", () => {
    const result = calculate(
      baseInput({
        competencies: [{ id: "a", weight: 100, critical: false }],
        questionEvaluations: [{ competencyId: "a", score: 5 }],
        mandatoryRequirements: [{ id: "certification" }],
        mandatoryRequirementEvaluations: [
          { requirementId: "certification", status: "met" },
        ],
      })
    );
    expect(result.status).toBe("PASS");
    expect(result.recommendation).toBe("PASS");
  });

  it("BORDERLINE when overall meets the threshold but a required supplementary gate is unmet (no result)", () => {
    const result = calculate(
      baseInput({
        competencies: [{ id: "a", weight: 100, critical: false }],
        questionEvaluations: [{ competencyId: "a", score: 5 }], // overall 100%
        supplementaryGates: [{ id: "english", required: true, minLevel: 3 }],
        supplementaryResults: [],
      })
    );
    expect(result.status).toBe("BORDERLINE");
    expect(result.reason).toMatch(/english/i);
  });

  it("BORDERLINE when the supplementary gate result is below minLevel", () => {
    const result = calculate(
      baseInput({
        competencies: [{ id: "a", weight: 100, critical: false }],
        questionEvaluations: [{ competencyId: "a", score: 5 }],
        supplementaryGates: [{ id: "english", required: true, minLevel: 3 }],
        supplementaryResults: [{ id: "english", level: 2 }],
      })
    );
    expect(result.status).toBe("BORDERLINE");
  });

  it("PASS when the supplementary gate result meets minLevel", () => {
    const result = calculate(
      baseInput({
        competencies: [{ id: "a", weight: 100, critical: false }],
        questionEvaluations: [{ competencyId: "a", score: 5 }],
        supplementaryGates: [{ id: "english", required: true, minLevel: 3 }],
        supplementaryResults: [{ id: "english", level: 4 }],
      })
    );
    expect(result.status).toBe("PASS");
  });

  it("PASS when a supplementary gate is configured but not required", () => {
    const result = calculate(
      baseInput({
        competencies: [{ id: "a", weight: 100, critical: false }],
        questionEvaluations: [{ competencyId: "a", score: 5 }],
        supplementaryGates: [{ id: "english", required: false, minLevel: 3 }],
        supplementaryResults: [],
      })
    );
    expect(result.status).toBe("PASS");
  });

  it("maps status to recommendation: PASS/FAIL/BORDERLINE -> PASS/FAIL/REVIEW_REQUIRED, others -> null", () => {
    const passish = calculate(
      baseInput({
        competencies: [{ id: "a", weight: 100, critical: false }],
        questionEvaluations: [{ competencyId: "a", score: 5 }],
      })
    );
    expect(passish.recommendation).toBe("PASS");

    const borderlineish = calculate(
      baseInput({
        competencies: [{ id: "a", weight: 100, critical: false }],
        questionEvaluations: [{ competencyId: "a", score: 3 }], // 60%
      })
    );
    expect(borderlineish.recommendation).toBe("REVIEW_REQUIRED");

    const failish = calculate(
      baseInput({
        competencies: [{ id: "a", weight: 100, critical: false }],
        questionEvaluations: [{ competencyId: "a", score: 1 }], // 20%
      })
    );
    expect(failish.recommendation).toBe("FAIL");
  });
});

describe("calculate — threshold boundaries (49/50/69/70)", () => {
  // Two non-critical competencies rigged so overall == weight of "high"
  // exactly: "low" always scores 0% and "high" always scores 100%, so
  // overall = (0 * wLow + 100 * wHigh) / 100 = wHigh. This lets us hit any
  // exact integer overall percentage without depending on PCT quantization.
  function overallOf(target: number) {
    return baseInput({
      competencies: [
        { id: "low", weight: 100 - target, critical: false },
        { id: "high", weight: target, critical: false },
      ],
      questionEvaluations: [
        { competencyId: "low", score: 0 },
        { competencyId: "high", score: 5 },
      ],
    });
  }

  it.each([
    [49, "FAIL"], // below borderlineMin (50)
    [50, "BORDERLINE"], // borderlineMin inclusive
    [69, "BORDERLINE"], // just below passThreshold (70)
    [70, "PASS"], // passThreshold inclusive
  ] as const)("overall=%i%% -> %s", (target, expected) => {
    const result = calculate(overallOf(target));
    expect(result.overall).toBe(target);
    expect(result.status).toBe(expected);
  });
});
