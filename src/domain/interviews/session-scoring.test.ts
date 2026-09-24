import { describe, expect, it } from "vitest";
import { computeSessionScoring } from "./session-scoring";

const competencies = [
  { id: "programming", weight: 60, critical: true },
  { id: "sql", weight: 40, critical: false },
];

describe("computeSessionScoring", () => {
  it("returns null overall and zero completion with no evaluations at all", () => {
    const result = computeSessionScoring(competencies, [], 50);
    expect(result.overall).toBeNull();
    expect(result.completion).toBe(0);
    expect(result.totalApplicable).toBe(0);
  });

  it("computes overall/completion/critical status from a mix of rated, na, and unrated questions", () => {
    const result = computeSessionScoring(
      competencies,
      [
        { competencyId: "programming", score: 4 }, // 80%
        { competencyId: "programming", score: null }, // unrated
        { competencyId: "sql", score: "na" },
        { competencyId: "sql", score: 3 }, // 60%
      ],
      50
    );

    expect(result.totalApplicable).toBe(3); // na excluded
    expect(result.totalEvaluated).toBe(2);
    expect(result.completion).toBeCloseTo((2 / 3) * 100);
    // Only "programming" and "sql" have evidence, weighted 60/40 as authored.
    expect(result.overall).toBeCloseTo(80 * 0.6 + 60 * 0.4);

    const programmingCritical = result.criticalCompetencyStatus.find(
      (c) => c.competencyId === "programming"
    );
    expect(programmingCritical?.hasEvidence).toBe(true);
    expect(programmingCritical?.meets).toBe(true); // 80% >= 50% criticalMin
  });

  it("flags a critical competency as not meeting its bar once it has evidence below criticalMin", () => {
    const result = computeSessionScoring(
      competencies,
      [{ competencyId: "programming", score: 1 }], // 20%
      50
    );
    const programmingCritical = result.criticalCompetencyStatus.find(
      (c) => c.competencyId === "programming"
    );
    expect(programmingCritical?.hasEvidence).toBe(true);
    expect(programmingCritical?.meets).toBe(false);
  });
});
