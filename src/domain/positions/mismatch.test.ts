import { describe, expect, it } from "vitest";
import { isPositionFieldMismatched } from "./mismatch";

// Plan §39.3/Phase 34/L-06 — this logic used to live directly inside
// templates/[id]/page.tsx (a UI component) with no test coverage of its
// own; moving it into domain/positions/ makes it directly testable.
describe("isPositionFieldMismatched", () => {
  it("is false when both values are null", () => {
    expect(isPositionFieldMismatched(null, null)).toBe(false);
  });

  it("is false when either value is missing — non-blocking means no data is never a mismatch", () => {
    expect(isPositionFieldMismatched("Senior", null)).toBe(false);
    expect(isPositionFieldMismatched(null, "Senior")).toBe(false);
  });

  it("is false when the values match, ignoring case and surrounding whitespace", () => {
    expect(isPositionFieldMismatched("Senior", "senior")).toBe(false);
    expect(isPositionFieldMismatched("  Senior  ", "Senior")).toBe(false);
  });

  it("is true when the values genuinely differ", () => {
    expect(isPositionFieldMismatched("Senior", "Mid-Level")).toBe(true);
  });
});
