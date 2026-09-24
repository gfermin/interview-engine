import { describe, expect, it } from "vitest";
import { candidateFormSchema, startSessionFormSchema } from "./schemas";

describe("candidateFormSchema", () => {
  it("requires a non-empty name", () => {
    expect(candidateFormSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("accepts a name with no optional fields, normalizing blanks to null", () => {
    const result = candidateFormSchema.safeParse({ name: "Jordan Rivera" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBeNull();
      expect(result.data.notes).toBeNull();
    }
  });

  it("trims whitespace and treats a blank email as null (not empty string)", () => {
    const result = candidateFormSchema.safeParse({
      name: "  Jordan Rivera  ",
      email: "   ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Jordan Rivera");
      expect(result.data.email).toBeNull();
    }
  });

  it("rejects a malformed email", () => {
    const result = candidateFormSchema.safeParse({
      name: "Jordan Rivera",
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a well-formed email", () => {
    const result = candidateFormSchema.safeParse({
      name: "Jordan Rivera",
      email: "jordan@example.com",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("jordan@example.com");
    }
  });
});

describe("startSessionFormSchema", () => {
  it("requires a templateId", () => {
    expect(startSessionFormSchema.safeParse({ templateId: "" }).success).toBe(false);
  });

  it("accepts a non-empty templateId", () => {
    const result = startSessionFormSchema.safeParse({ templateId: "some-uuid" });
    expect(result.success).toBe(true);
  });
});
