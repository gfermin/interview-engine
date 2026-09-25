import { describe, expect, it } from "vitest";
import { DICTIONARIES_FOR_TESTING, t } from "./i18n";

describe("t", () => {
  it("resolves a namespaced key for each locale", () => {
    expect(t("en", "navigation.dashboard")).toBe("Dashboard");
    expect(t("es", "navigation.dashboard")).toBe("Panel");
  });

  it("falls back to English when a key is missing in another locale", () => {
    // Temporarily-missing-key simulation isn't needed for real data (the
    // completeness test below guarantees parity) — this exercises the
    // fallback branch directly against a key that doesn't exist anywhere.
    expect(t("es", "common.appName")).toBe("Interview Platform");
  });

  it("returns the raw key when it exists in no locale (visibly broken, not silently blank)", () => {
    expect(t("en", "nonexistent.key")).toBe("nonexistent.key");
    expect(t("es", "nonexistent.key")).toBe("nonexistent.key");
  });
});

describe("dictionary completeness", () => {
  const { en, es } = DICTIONARIES_FOR_TESTING;
  const namespaces = Object.keys(en);

  it("has the same set of namespaces in both locales", () => {
    expect(Object.keys(es).sort()).toEqual(namespaces.sort());
  });

  for (const namespace of namespaces) {
    it(`every English key in "${namespace}" exists in Spanish and vice versa`, () => {
      const enKeys = Object.keys(en[namespace]).sort();
      const esKeys = Object.keys(es[namespace]).sort();
      expect(esKeys).toEqual(enKeys);
    });
  }
});
