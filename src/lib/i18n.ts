// Minimal i18n foundation (plan Phase 20/§42) — deliberately not next-intl/
// react-i18next: this app is 100% Server Components + Server Actions with no
// client router or state library, so a library built around `[locale]`
// URL-segment routing or a client Context provider would force restructuring
// every route for no benefit here. This mirrors exactly how
// features/settings/theme.ts already solves the same "per-viewer preference,
// resolved in a Server Component" problem — a plain lookup function, no
// provider, no client runtime.
//
// Namespaced JSON resources (plan §30) keep translations findable by feature
// area rather than one growing file. A key is "namespace.key" — the FIRST
// dot splits namespace from key; everything after it is looked up as-is in
// that namespace's flat dictionary (no further nesting), matching every key
// shape used across the plan's own examples (navigation.dashboard,
// reports.title, etc).
import common_en from "@/locales/en/common.json";
import common_es from "@/locales/es/common.json";
import navigation_en from "@/locales/en/navigation.json";
import navigation_es from "@/locales/es/navigation.json";
import dashboard_en from "@/locales/en/dashboard.json";
import dashboard_es from "@/locales/es/dashboard.json";
import interview_en from "@/locales/en/interview.json";
import interview_es from "@/locales/es/interview.json";
import reports_en from "@/locales/en/reports.json";
import reports_es from "@/locales/es/reports.json";
import settings_en from "@/locales/en/settings.json";
import settings_es from "@/locales/es/settings.json";
import templates_en from "@/locales/en/templates.json";
import templates_es from "@/locales/es/templates.json";
import candidates_en from "@/locales/en/candidates.json";
import candidates_es from "@/locales/es/candidates.json";
import positions_en from "@/locales/en/positions.json";
import positions_es from "@/locales/es/positions.json";

export type Locale = "en" | "es";

export const LOCALES: readonly Locale[] = ["en", "es"];

type NamespaceDictionary = Record<string, string>;

const DICTIONARIES: Record<Locale, Record<string, NamespaceDictionary>> = {
  en: {
    common: common_en,
    navigation: navigation_en,
    dashboard: dashboard_en,
    settings: settings_en,
    reports: reports_en,
    interview: interview_en,
    templates: templates_en,
    candidates: candidates_en,
    positions: positions_en,
  },
  es: {
    common: common_es,
    navigation: navigation_es,
    dashboard: dashboard_es,
    settings: settings_es,
    reports: reports_es,
    interview: interview_es,
    templates: templates_es,
    candidates: candidates_es,
    positions: positions_es,
  },
};

/**
 * Looks up a `"namespace.key"` translation for the given locale. Internal/
 * business enum values (status, stage, difficulty, decision — plan §32) are
 * never looked up here; they go through their own stage-aware label maps
 * (e.g. domain/interviews/stage-config.ts), which stay locale-independent
 * for now (Phase 21 extends those, not this function).
 *
 * Falls back to the English string if a key is missing for a non-English
 * locale, and to the raw key itself if it's missing everywhere — visibly
 * broken rather than silently blank, and exactly what
 * `dictionaryCompleteness` (i18n.test.ts) exists to catch before it ships.
 */
export function t(locale: Locale, key: string): string {
  const dotIndex = key.indexOf(".");
  const namespace = dotIndex === -1 ? key : key.slice(0, dotIndex);
  const restKey = dotIndex === -1 ? "" : key.slice(dotIndex + 1);

  const value = DICTIONARIES[locale]?.[namespace]?.[restKey];
  if (value !== undefined) return value;

  if (locale !== "en") {
    const fallback = DICTIONARIES.en[namespace]?.[restKey];
    if (fallback !== undefined) return fallback;
  }

  return key;
}

/** Exposed only for the completeness test — every other caller should go
 * through {@link t}. */
export const DICTIONARIES_FOR_TESTING = DICTIONARIES;
