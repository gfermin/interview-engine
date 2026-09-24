import { describe, expect, it } from "vitest";
import { getStageConfig, statusLabelFor } from "./stage-config";

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
