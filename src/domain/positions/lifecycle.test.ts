import { describe, expect, it } from "vitest";
import { canDeletePosition } from "./lifecycle";

describe("canDeletePosition", () => {
  it("allows deleting a position with no locked templates", () => {
    const result = canDeletePosition(0);
    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("refuses to delete a position with at least one locked template, and explains why", () => {
    const result = canDeletePosition(1);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/1 of its template has/);
    expect(result.reason).toMatch(/Archive it instead/);
  });

  it("pluralizes correctly for more than one locked template", () => {
    const result = canDeletePosition(3);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/3 of its templates have/);
  });
});
