import { describe, expect, it } from "vitest";
import { resolveLocale } from "./locale";

describe("resolveLocale", () => {
  it("defaults to English when no cookie is set", () => {
    expect(resolveLocale(undefined)).toBe("en");
  });

  it("defaults to English for any value other than exactly 'es'", () => {
    expect(resolveLocale("")).toBe("en");
    expect(resolveLocale("ES")).toBe("en");
    expect(resolveLocale("spanish")).toBe("en");
    expect(resolveLocale("en")).toBe("en");
  });

  it("resolves to Spanish only for the exact value 'es'", () => {
    expect(resolveLocale("es")).toBe("es");
  });
});
