// Plain (non-"use server") module, matching theme.ts's shape exactly (plan
// Phase 20/§42) so the cookie name and resolution logic can be shared
// between the Server Action (settings/actions.ts) and every Server
// Component that reads it (root layout, Dashboard, Settings, ...) without
// duplicating either.
import type { Locale } from "@/lib/i18n";

export const APP_LOCALE_COOKIE = "app-locale";

/** Defaults to English — the app's actual current UI language (confirmed
 * against the live codebase before this phase started: every hardcoded
 * string audited was English), so an unset cookie changes nothing about
 * today's behavior. Only the exact value "es" switches to Spanish. */
export function resolveLocale(cookieValue: string | undefined): Locale {
  return cookieValue === "es" ? "es" : "en";
}
