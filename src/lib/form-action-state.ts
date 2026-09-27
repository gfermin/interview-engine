import type { z } from "zod";
import { t, type Locale } from "@/lib/i18n";

/** Shared Server Action return shape for every `useActionState` form in the
 * app (plan Phase 34/L-03) — previously redeclared identically in the
 * templates/interviews/positions/candidates features' `actions.ts` files. */
export interface FormActionState {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

/** Parses `formData` against `schema` and returns either the parsed data or
 * a ready-to-return {@link FormActionState} (plan Phase 34/L-04) — replaces
 * the `parsed.error.flatten().fieldErrors` boilerplate repeated across every
 * feature's `actions.ts`.
 *
 * Plan Phase 28/AUDIT-013 — every `schemas.ts` Zod message is now a
 * `"namespace.key"` translation key (schemas are locale-unaware singletons,
 * so they can't call `t()` themselves), resolved here through `t()` once the
 * caller's request locale is known, rather than a hardcoded English string
 * baked in at module-load time. */
export function parseFormOrError<T>(
  schema: z.ZodType<T>,
  formData: FormData,
  locale: Locale
): { data: T; error?: undefined } | { data?: undefined; error: FormActionState } {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const rawFieldErrors = parsed.error.flatten().fieldErrors as Record<string, string[] | undefined>;
    const fieldErrors: Record<string, string[] | undefined> = {};
    for (const [field, messages] of Object.entries(rawFieldErrors)) {
      fieldErrors[field] = messages?.map((key) => t(locale, key));
    }
    return {
      error: {
        error: t(locale, "common.pleaseFixErrors"),
        fieldErrors,
      },
    };
  }
  return { data: parsed.data };
}
