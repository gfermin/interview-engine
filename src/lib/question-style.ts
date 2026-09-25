// The artifact's `.mchip.diff-*` difficulty color-coding, shared between
// every place a question's difficulty is displayed (the live-rating
// QuestionCard and the template builder's question list) so the two never
// drift out of sync with each other or with the artifact's own mapping.
// A value outside this map (shouldn't happen given the AI/form schemas both
// restrict to easy/medium/hard) falls back to a neutral border.
const DIFFICULTY_CLASSES: Record<string, string> = {
  easy: "border-pass-border bg-pass-bg text-pass",
  medium: "border-borderline-border bg-borderline-bg text-borderline",
  hard: "border-fail-border bg-fail-bg text-fail",
};

export function difficultyBadgeClass(difficulty: string): string {
  return DIFFICULTY_CLASSES[difficulty.toLowerCase()] ?? "border-border";
}
