// The shared pass/borderline/fail/provisional/na color vocabulary (plan
// Phase 14/§41) — any status-like concept in the app maps onto these five
// tones rather than inventing its own color logic, so "fail" always looks
// the same everywhere. Lives in `lib/` (not `features/interviews/`, where
// {@link ToneBadge} itself lives) specifically so non-feature-scoped
// consumers like `question-style.ts`'s difficulty color-coding can reuse
// the same class strings without a features->lib layering violation (plan
// Phase 34/L-10 — `difficultyBadgeClass` used to duplicate these in
// parallel, verbatim, with no shared source).
export type BadgeTone = "pass" | "borderline" | "fail" | "provisional" | "na";

export const TONE_CLASSES: Record<BadgeTone, string> = {
  pass: "border-pass-border bg-pass-bg text-pass",
  borderline: "border-borderline-border bg-borderline-bg text-borderline",
  fail: "border-fail-border bg-fail-bg text-fail",
  provisional: "border-provisional-border bg-provisional-bg text-provisional",
  na: "border-na-border bg-na-bg text-na",
};
