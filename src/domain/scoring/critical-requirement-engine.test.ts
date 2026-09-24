import { describe, expect, it } from "vitest";
import { calculateCriticalRequirements } from "./critical-requirement-engine";
import { calculateCompetencyStats } from "./scoring-engine";
import type { Competency, MandatoryRequirement } from "./types";

const CRITERIA_MIN = 50;

describe("calculateCriticalRequirements — critical competencies", () => {
  it("a critical competency with NO evidence is not a fail, but has no evidence", () => {
    const competencies: Competency[] = [
      { id: "programming", weight: 100, critical: true },
    ];
    const stats = calculateCompetencyStats(competencies, []); // nothing rated

    const result = calculateCriticalRequirements(
      competencies,
      stats,
      CRITERIA_MIN,
      [],
      []
    );

    expect(result.criticalCompetencyStatus).toEqual([
      { competencyId: "programming", percent: null, hasEvidence: false, meets: false },
    ]);
    expect(result.allCriticalHaveEvidence).toBe(false);
    // No evidence yet is NOT the same as failing — the knockout only fires
    // once there IS evidence and it falls short.
    expect(result.anyCriticalFail).toBe(false);
  });

  it("a critical competency WITH evidence below criticalMin is a fail", () => {
    const competencies: Competency[] = [
      { id: "programming", weight: 100, critical: true },
    ];
    const stats = calculateCompetencyStats(competencies, [
      { competencyId: "programming", score: 2 }, // 40% < 50% criticalMin
    ]);

    const result = calculateCriticalRequirements(
      competencies,
      stats,
      CRITERIA_MIN,
      [],
      []
    );

    expect(result.allCriticalHaveEvidence).toBe(true);
    expect(result.anyCriticalFail).toBe(true);
    expect(result.criticalCompetencyStatus[0]).toEqual({
      competencyId: "programming",
      percent: 40,
      hasEvidence: true,
      meets: false,
    });
  });

  it("a critical competency WITH evidence at/above criticalMin meets it", () => {
    const competencies: Competency[] = [
      { id: "programming", weight: 100, critical: true },
    ];
    const stats = calculateCompetencyStats(competencies, [
      { competencyId: "programming", score: 3 }, // 60% >= 50%
    ]);

    const result = calculateCriticalRequirements(
      competencies,
      stats,
      CRITERIA_MIN,
      [],
      []
    );

    expect(result.anyCriticalFail).toBe(false);
    expect(result.criticalCompetencyStatus[0].meets).toBe(true);
  });

  it("non-critical competencies never appear in criticalCompetencyStatus", () => {
    const competencies: Competency[] = [
      { id: "sql", weight: 100, critical: false },
    ];
    const stats = calculateCompetencyStats(competencies, [
      { competencyId: "sql", score: 0 },
    ]);

    const result = calculateCriticalRequirements(
      competencies,
      stats,
      CRITERIA_MIN,
      [],
      []
    );

    expect(result.criticalCompetencyStatus).toEqual([]);
    expect(result.allCriticalHaveEvidence).toBe(true); // vacuously true
    expect(result.anyCriticalFail).toBe(false);
  });
});

describe("calculateCriticalRequirements — mandatory requirements", () => {
  const requirements: MandatoryRequirement[] = [{ id: "work_authorization" }];

  it("an unevaluated mandatory requirement is 'unknown', not a fail", () => {
    const result = calculateCriticalRequirements(
      [],
      new Map(),
      CRITERIA_MIN,
      requirements,
      []
    );

    expect(result.mandatoryRequirementStatus).toEqual([
      { requirementId: "work_authorization", status: "unknown" },
    ]);
    expect(result.allMandatoryRequirementsEvaluated).toBe(false);
    expect(result.anyMandatoryRequirementFailed).toBe(false);
  });

  it("a mandatory requirement explicitly marked not_met fails independently of competency scoring", () => {
    const result = calculateCriticalRequirements(
      [],
      new Map(),
      CRITERIA_MIN,
      requirements,
      [{ requirementId: "work_authorization", status: "not_met" }]
    );

    expect(result.allMandatoryRequirementsEvaluated).toBe(true);
    expect(result.anyMandatoryRequirementFailed).toBe(true);
  });

  it("a mandatory requirement explicitly marked met is satisfied", () => {
    const result = calculateCriticalRequirements(
      [],
      new Map(),
      CRITERIA_MIN,
      requirements,
      [{ requirementId: "work_authorization", status: "met" }]
    );

    expect(result.allMandatoryRequirementsEvaluated).toBe(true);
    expect(result.anyMandatoryRequirementFailed).toBe(false);
  });

  it("with no mandatory requirements configured, both checks are vacuously true/false", () => {
    const result = calculateCriticalRequirements([], new Map(), CRITERIA_MIN, [], []);
    expect(result.allMandatoryRequirementsEvaluated).toBe(true);
    expect(result.anyMandatoryRequirementFailed).toBe(false);
  });
});
