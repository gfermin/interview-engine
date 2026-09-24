import { describe, expect, it } from "vitest";
import {
  canRecordDecision,
  isValidDecisionMode,
  requiresForcedCall,
  requiresReason,
  resolveFinalDecision,
} from "./decision";

describe("canRecordDecision", () => {
  it("is false for NOT_EVALUATED and PROVISIONAL", () => {
    expect(canRecordDecision("NOT_EVALUATED")).toBe(false);
    expect(canRecordDecision("PROVISIONAL")).toBe(false);
  });

  it("is true for PASS, FAIL, and BORDERLINE", () => {
    expect(canRecordDecision("PASS")).toBe(true);
    expect(canRecordDecision("FAIL")).toBe(true);
    expect(canRecordDecision("BORDERLINE")).toBe(true);
  });
});

describe("requiresForcedCall", () => {
  it("is true only for BORDERLINE", () => {
    expect(requiresForcedCall("BORDERLINE")).toBe(true);
    expect(requiresForcedCall("PASS")).toBe(false);
    expect(requiresForcedCall("FAIL")).toBe(false);
    expect(requiresForcedCall("PROVISIONAL")).toBe(false);
  });
});

describe("isValidDecisionMode", () => {
  it("allows accept/override on PASS or FAIL, rejects forced_call", () => {
    expect(isValidDecisionMode("PASS", "accept")).toBe(true);
    expect(isValidDecisionMode("PASS", "override")).toBe(true);
    expect(isValidDecisionMode("PASS", "forced_call")).toBe(false);
    expect(isValidDecisionMode("FAIL", "accept")).toBe(true);
    expect(isValidDecisionMode("FAIL", "override")).toBe(true);
  });

  it("only allows forced_call on BORDERLINE", () => {
    expect(isValidDecisionMode("BORDERLINE", "forced_call")).toBe(true);
    expect(isValidDecisionMode("BORDERLINE", "accept")).toBe(false);
    expect(isValidDecisionMode("BORDERLINE", "override")).toBe(false);
  });

  it("rejects every mode on NOT_EVALUATED/PROVISIONAL", () => {
    for (const mode of ["accept", "override", "forced_call"] as const) {
      expect(isValidDecisionMode("NOT_EVALUATED", mode)).toBe(false);
      expect(isValidDecisionMode("PROVISIONAL", mode)).toBe(false);
    }
  });
});

describe("requiresReason", () => {
  it("requires a reason for override and forced_call, not accept", () => {
    expect(requiresReason("accept")).toBe(false);
    expect(requiresReason("override")).toBe(true);
    expect(requiresReason("forced_call")).toBe(true);
  });
});

describe("resolveFinalDecision", () => {
  it("accept returns the calculated status verbatim", () => {
    expect(resolveFinalDecision("PASS", "accept")).toBe("PASS");
    expect(resolveFinalDecision("FAIL", "accept")).toBe("FAIL");
  });

  it("override flips the calculated status", () => {
    expect(resolveFinalDecision("PASS", "override")).toBe("FAIL");
    expect(resolveFinalDecision("FAIL", "override")).toBe("PASS");
  });

  it("forced_call returns the interviewer's explicit choice on BORDERLINE", () => {
    expect(resolveFinalDecision("BORDERLINE", "forced_call", "PASS")).toBe("PASS");
    expect(resolveFinalDecision("BORDERLINE", "forced_call", "FAIL")).toBe("FAIL");
  });

  it("throws on an invalid mode/status combination", () => {
    expect(() => resolveFinalDecision("BORDERLINE", "accept")).toThrow(/not valid/);
    expect(() => resolveFinalDecision("PROVISIONAL", "forced_call", "PASS")).toThrow(/not valid/);
  });

  it("throws when a forced call has no explicit choice", () => {
    expect(() => resolveFinalDecision("BORDERLINE", "forced_call")).toThrow(/explicit PASS\/FAIL/);
  });
});
