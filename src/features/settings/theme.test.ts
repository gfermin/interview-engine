import { describe, expect, it } from "vitest";
import { resolveTheme } from "./theme";

describe("resolveTheme", () => {
  it("defaults to dark when no cookie is set", () => {
    expect(resolveTheme(undefined)).toBe("dark");
  });

  it("defaults to dark for any value other than exactly 'light'", () => {
    expect(resolveTheme("")).toBe("dark");
    expect(resolveTheme("Light")).toBe("dark");
    expect(resolveTheme("dark")).toBe("dark");
  });

  it("resolves to light only for the exact value 'light'", () => {
    expect(resolveTheme("light")).toBe("light");
  });
});
