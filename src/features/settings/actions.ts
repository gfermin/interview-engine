"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
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
