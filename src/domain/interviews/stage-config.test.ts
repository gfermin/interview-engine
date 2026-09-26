import { describe, expect, it } from "vitest";
import { getStageConfig, rubricLabelFor, statusLabelFor } from "./stage-config";

describe("getStageConfig", () => {
  it("enables code exercises for technical, disables for screening", () => {
    expect(getStageConfig("technical").modules.codeExercises).toBe(true);
    expect(getStageConfig("screening").modules.codeExercises).toBe(false);
  });

  it("offers supplementary assessments in both stages", () => {
    expect(getStageConfig("technical").modules.supplementaryAssessments).toBe(true);
    expect(getStageConfig("screening").modules.supplementaryAssessments).toBe(true);
  });
});

describe("statusLabelFor", () => {
  it("relabels the same internal status differently per stage", () => {
    expect(statusLabelFor("technical", "FAIL")).toBe("Fail");
    expect(statusLabelFor("screening", "FAIL")).toBe("Not Advancing");
    expect(statusLabelFor("technical", "PASS")).toBe("Pass");
    expect(statusLabelFor("screening", "PASS")).toBe("Advance");
  });

  it("covers every InterviewStatus value for both stages", () => {
    const statuses = [
      "NOT_EVALUATED",
      "PROVISIONAL",
      "FAIL",
      "BORDERLINE",
      "PASS",
    ] as const;
    for (const status of statuses) {
      expect(typeof statusLabelFor("technical", status)).toBe("string");
      expect(typeof statusLabelFor("screening", status)).toBe("string");
    }
  });
});

// Plan Phase 22/§43.8: HR-friendly evidence-based rubric labels for
// Screening vs. depth-based labels for Technical — presentation only, never
// a different numeric scale (the underlying ScoreValue 0-5 is identical).
describe("rubricLabelFor", () => {
  it("uses evidence-based wording for screening and depth-based wording for technical", () => {
    expect(rubricLabelFor("screening", 3)).toBe("Meets Screening Expectation");
    expect(rubricLabelFor("technical", 3)).toBe("Meets Expected Level");
    expect(rubricLabelFor("screening", 0)).toMatch(/No Evidence/);
    expect(rubricLabelFor("technical", 0)).toBe("No Understanding");
  });

  it("covers every ScoreValue (0-5) for both stages", () => {
    for (const score of [0, 1, 2, 3, 4, 5] as const) {
      expect(typeof rubricLabelFor("technical", score)).toBe("string");
      expect(typeof rubricLabelFor("screening", score)).toBe("string");
    }
  });

  it("is exposed via getStageConfig().rubricLabels", () => {
    expect(getStageConfig("screening").rubricLabels[3]).toBe("Meets Screening Expectation");
  });
});
