// Plain (non-"use server") module so the cookie name and resolution logic
// can be shared between the Server Action (settings/actions.ts, which can
// only export async functions) and the Server Components that read it
// (root layout, Settings page) without duplicating either.
export type Theme = "light" | "dark";

export const THEME_COOKIE = "theme";

/** Defaults to dark whenever the cookie is missing or holds anything other
 * than exactly "light" — the platform's requested default, distinct from
 * following the visitor's OS `prefers-color-scheme` (the artifact itself
 * did that; this app makes it an explicit, remembered choice instead). */
export function resolveTheme(cookieValue: string | undefined): Theme {
  return cookieValue === "light" ? "light" : "dark";
}
