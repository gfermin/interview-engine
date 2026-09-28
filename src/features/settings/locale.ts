// Plain (non-"use server") module, matching theme.ts's shape exactly (plan
// Phase 20/§42) so the cookie name and resolution logic can be shared
// between the Server Action (settings/actions.ts) and every Server
// Component that reads it (root layout, Dashboard, Settings, ...) without
// duplicating either.
import { cookies } from "next/headers";
import type { Locale } from "@/lib/i18n";

export const APP_LOCALE_COOKIE = "app-locale";

/** Defaults to English — the app's actual current UI language (confirmed
 * against the live codebase before this phase started: every hardcoded
 * string audited was English), so an unset cookie changes nothing about
 * today's behavior. Only the exact value "es" switches to Spanish. */
export function resolveLocale(cookieValue: string | undefined): Locale {
  return cookieValue === "es" ? "es" : "en";
}

/** Plan Phase 28/AUDIT-013 — the same cookie->locale resolution every Server
 * Component already does, callable from inside a Server Action too (where
 * there's no `params`/props to thread a locale through) so validation/error
 * messages can localize without changing any client call site.
 *
 * `cookies()` throws when called outside a real request scope (Next.js's
 * own restriction) — which is exactly what happens when a test calls one of
 * these Server Actions directly as a plain function, with no live request
 * behind it. Falling back to the default locale there is correct, not a
 * workaround: there's no cookie to read in that case either way, and every
 * real invocation (an actual form submission) always runs inside a request. */
export async function getRequestLocale(): Promise<Locale> {
  try {
    const store = await cookies();
    return resolveLocale(store.get(APP_LOCALE_COOKIE)?.value);
  } catch {
    return "en";
  }
}
