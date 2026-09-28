import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseFormOrError } from "./form-action-state";

const schema = z.object({
  name: z.string().trim().min(1, "validation.name.required"),
});

function formData(values: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(values)) fd.set(key, value);
  return fd;
}

// AUDIT-013/Phase 28 — schemas.ts messages are now translation KEYS, not
// literal English strings; parseFormOrError is what actually resolves them
// through t() once the request locale is known. This is the one behavior
// the i18n completeness test (which only proves keys exist in both
// dictionaries) can't catch on its own — that a real validation failure
// actually renders in the requested locale, not just in English.
describe("parseFormOrError", () => {
  it("resolves field-error keys to English text for locale 'en'", async () => {
    const result = parseFormOrError(schema, formData({ name: "" }), "en");

    expect(result.error?.fieldErrors?.name?.[0]).toBe("Name is required");
    expect(result.error?.error).toBe("Please fix the errors below.");
  });

  it("resolves the same field-error keys to Spanish text for locale 'es'", async () => {
    const result = parseFormOrError(schema, formData({ name: "" }), "es");

    expect(result.error?.fieldErrors?.name?.[0]).toBe("El nombre es obligatorio");
    expect(result.error?.error).toBe("Corrige los errores a continuación.");
  });

  it("returns the parsed data, not an error, for valid input", async () => {
    const result = parseFormOrError(schema, formData({ name: "Jordan" }), "en");

    expect(result.error).toBeUndefined();
    expect(result.data?.name).toBe("Jordan");
  });
});
