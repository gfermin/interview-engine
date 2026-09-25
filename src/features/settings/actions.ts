"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import type { Locale } from "@/lib/i18n";
import { APP_LOCALE_COOKIE } from "./locale";
import { THEME_COOKIE, type Theme } from "./theme";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** Bound with `.bind(null, "dark" | "light")` per Settings button, same
 * fire-and-forget plain-form pattern as RateBar/MandatoryRequirementControl.
 * `revalidatePath("/", "layout")` re-renders the root layout (which reads
 * this same cookie) so the theme change is visible immediately, not just on
 * the next hard navigation. */
export async function setThemeAction(theme: Theme) {
  const cookieStore = await cookies();
  cookieStore.set(THEME_COOKIE, theme, {
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}

/** The APPLICATION language switch (plan Phase 20/§42) — mirrors
 * `setThemeAction` exactly. This is intentionally the only thing this
 * action touches: it never writes to any InterviewTemplate/session data, so
 * switching it can never mutate stored interview content (plan §26/§43),
 * and a form submission mid-interview loses no in-progress work since
 * ratings/notes persist independently on every change (Phase 8). */
export async function setLocaleAction(locale: Locale) {
  const cookieStore = await cookies();
  cookieStore.set(APP_LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}
