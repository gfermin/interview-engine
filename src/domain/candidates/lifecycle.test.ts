import { describe, expect, it } from "vitest";
import { canDeleteCandidate } from "./lifecycle";

describe("canDeleteCandidate", () => {
  it("allows deleting a candidate with zero interview sessions", () => {
    const result = canDeleteCandidate(0);
    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it("refuses to delete a candidate with at least one session, and explains why", () => {
    const result = canDeleteCandidate(1);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/1 interview session exists/);
    expect(result.reason).toMatch(/Archive instead/);
  });

  it("pluralizes correctly for more than one session", () => {
    const result = canDeleteCandidate(2);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/2 interview sessions exist/);
  });
});
