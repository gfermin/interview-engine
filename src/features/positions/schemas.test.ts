import { describe, expect, it } from "vitest";
import { jobDescriptionFormSchema, positionFormSchema } from "./schemas";

describe("positionFormSchema", () => {
  it("requires a non-empty title", () => {
    const result = positionFormSchema.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });

  it("accepts a title with no optional fields", () => {
    const result = positionFormSchema.safeParse({ title: "Backend Developer" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.roleFamily).toBeNull();
      expect(result.data.seniority).toBeNull();
      expect(result.data.department).toBeNull();
    }
  });

  // Plan §39.3: roleFamily/seniority are free text, not a rigid enum — any
  // string is accepted, including values outside the suggestion list.
  it("accepts arbitrary free text for roleFamily and seniority, not just the suggested values", () => {
    const result = positionFormSchema.safeParse({
      title: "Head of Automation Wizardry",
      roleFamily: "Something Entirely Novel",
      seniority: "Grandmaster",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.roleFamily).toBe("Something Entirely Novel");
      expect(result.data.seniority).toBe("Grandmaster");
    }
  });

  it("trims whitespace and treats blank optional fields as null (not empty string)", () => {
    const result = positionFormSchema.safeParse({
      title: "  Senior Backend Developer  ",
      roleFamily: "   ",
      seniority: "  Senior  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Senior Backend Developer");
      expect(result.data.roleFamily).toBeNull();
      expect(result.data.seniority).toBe("Senior");
    }
  });
});

describe("jobDescriptionFormSchema", () => {
  it("rejects an empty or too-short Job Description", () => {
    expect(jobDescriptionFormSchema.safeParse({ rawText: "" }).success).toBe(false);
    expect(jobDescriptionFormSchema.safeParse({ rawText: "too short" }).success).toBe(
      false
    );
  });

  it("accepts a reasonably long Job Description", () => {
    const rawText =
      "We are looking for a Senior Backend Developer with experience in distributed systems...";
    const result = jobDescriptionFormSchema.safeParse({ rawText });
    expect(result.success).toBe(true);
  });
});
