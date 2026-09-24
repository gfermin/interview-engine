import { describe, expect, it } from "vitest";
import { buildNarrative } from "./narrative";

describe("buildNarrative", () => {
  it("includes seniority when given", () => {
    const text = buildNarrative({
      candidateName: "Jordan Rivera",
      positionTitle: "Senior Backend Developer",
      seniority: "Senior",
      statusLabel: "Pass",
      overall: 82.4,
      completion: 100,
      reason: "Overall score meets the passing threshold.",
    });
    expect(text).toContain("Jordan Rivera");
    expect(text).toContain("at the requested Senior level");
    expect(text).toContain("82%");
    expect(text).toContain("100% of the interview completed");
    expect(text).toContain("Pass");
  });

  it("omits the seniority clause when null", () => {
    const text = buildNarrative({
      candidateName: "Jordan Rivera",
      positionTitle: "Senior Backend Developer",
      seniority: null,
      statusLabel: "Fail",
      overall: 40,
      completion: 80,
      reason: "Below threshold.",
    });
    expect(text).not.toContain("at the requested");
  });

  it("renders a placeholder when overall is null (no scored evidence)", () => {
    const text = buildNarrative({
      candidateName: "Jordan Rivera",
      positionTitle: "Senior Backend Developer",
      seniority: null,
      statusLabel: "Not Evaluated",
      overall: null,
      completion: 0,
      reason: "No evidence recorded yet.",
    });
    expect(text).toContain("not yet scoreable");
  });
});
