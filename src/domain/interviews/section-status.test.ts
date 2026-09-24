import { describe, expect, it } from "vitest";
import { calculateSectionStatus } from "./section-status";

describe("calculateSectionStatus", () => {
  it("is not_started when nothing has been answered", () => {
    expect(calculateSectionStatus(3, { evaluated: 0, na: 0 }, null)).toBe("not_started");
  });

  it("is in_progress once at least one question is answered but not all", () => {
    expect(calculateSectionStatus(3, { evaluated: 1, na: 0 }, null)).toBe("in_progress");
    expect(calculateSectionStatus(3, { evaluated: 0, na: 1 }, null)).toBe("in_progress");
  });

  it("is complete once every question is rated or N/A", () => {
    expect(calculateSectionStatus(3, { evaluated: 2, na: 1 }, null)).toBe("complete");
  });

  it("is not_started for a competency with zero questions", () => {
    expect(calculateSectionStatus(0, { evaluated: 0, na: 0 }, null)).toBe("not_started");
  });

  it("is critical_concern when a critical competency has evidence but fails, even if fully answered", () => {
    expect(
      calculateSectionStatus(3, { evaluated: 3, na: 0 }, { hasEvidence: true, meets: false })
    ).toBe("critical_concern");
  });

  it("is not critical_concern when the critical competency has no evidence yet", () => {
    expect(
      calculateSectionStatus(3, { evaluated: 0, na: 0 }, { hasEvidence: false, meets: false })
    ).toBe("not_started");
  });

  it("is not critical_concern when the critical competency meets its bar", () => {
    expect(
      calculateSectionStatus(3, { evaluated: 3, na: 0 }, { hasEvidence: true, meets: true })
    ).toBe("complete");
  });
});
