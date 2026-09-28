import { TONE_CLASSES } from "./tone-style";

// The artifact's `.mchip.diff-*` difficulty color-coding, shared between
// every place a question's difficulty is displayed (the live-rating
// QuestionCard and the template builder's question list) so the two never
// drift out of sync with each other or with the artifact's own mapping.
// Maps onto the same shared pass/borderline/fail tone classes `ToneBadge`
// uses (plan Phase 34/L-10 — this used to duplicate those class strings
// verbatim instead of reusing them, an easy-to-miss drift risk). A value
// outside this map (shouldn't happen given the AI/form schemas both
// restrict to easy/medium/hard) falls back to a neutral border.
const DIFFICULTY_TONE: Record<string, keyof typeof TONE_CLASSES> = {
  easy: "pass",
  medium: "borderline",
  hard: "fail",
};

export function difficultyBadgeClass(difficulty: string): string {
  const tone = DIFFICULTY_TONE[difficulty.toLowerCase()];
  return tone ? TONE_CLASSES[tone] : "border-border";
}
