import { describe, expect, it } from "vitest";
import { categorizeCompetencies } from "./result-categories";

const CONFIG = { borderlineMin: 50, passThreshold: 70 };

describe("categorizeCompetencies", () => {
  it("excludes competencies with no evidence yet from every list", () => {
    const result = categorizeCompetencies(
      [{ competencyId: "a", name: "A", percent: null }],
      CONFIG
    );
    expect(result).toEqual({ strengths: [], borderlineAreas: [], concerns: [] });
  });

  it("is a strength at exactly 80%", () => {
    const result = categorizeCompetencies(
      [{ competencyId: "a", name: "A", percent: 80 }],
      CONFIG
    );
    expect(result.strengths).toHaveLength(1);
  });

  it("is a concern below borderlineMin, and not a concern at exactly borderlineMin", () => {
    const below = categorizeCompetencies(
      [{ competencyId: "a", name: "A", percent: 49 }],
      CONFIG
    );
    expect(below.concerns).toHaveLength(1);
    expect(below.borderlineAreas).toHaveLength(0);

    const atFloor = categorizeCompetencies(
      [{ competencyId: "a", name: "A", percent: 50 }],
      CONFIG
    );
    expect(atFloor.concerns).toHaveLength(0);
    expect(atFloor.borderlineAreas).toHaveLength(1);
  });

  it("is borderline up to but excluding passThreshold", () => {
    const atCeiling = categorizeCompetencies(
      [{ competencyId: "a", name: "A", percent: 69 }],
      CONFIG
    );
    expect(atCeiling.borderlineAreas).toHaveLength(1);

    const atThreshold = categorizeCompetencies(
      [{ competencyId: "a", name: "A", percent: 70 }],
      CONFIG
    );
    expect(atThreshold.borderlineAreas).toHaveLength(0);
  });

  it("sorts borderline areas ascending by score, lowest first", () => {
    const result = categorizeCompetencies(
      [
        { competencyId: "a", name: "A", percent: 65 },
        { competencyId: "b", name: "B", percent: 55 },
        { competencyId: "c", name: "C", percent: 60 },
      ],
      CONFIG
    );
    expect(result.borderlineAreas.map((c) => c.competencyId)).toEqual(["b", "c", "a"]);
  });
});
