// A plain template-string narrative (plan §17: "a generalization of the
// artifact's buildNarrative(), currently template-string-based") — not an
// AI call. Pure function: plain data in, one paragraph of text out.

export interface NarrativeInput {
  candidateName: string;
  positionTitle: string;
  seniority: string | null;
  statusLabel: string;
  overall: number | null;
  completion: number;
  reason: string;
}

export function buildNarrative(input: NarrativeInput): string {
  const overallText = input.overall !== null ? `${Math.round(input.overall)}%` : "not yet scoreable";
  const seniorityText = input.seniority ? ` at the requested ${input.seniority} level` : "";

  return (
    `${input.candidateName} was evaluated for ${input.positionTitle}${seniorityText}, ` +
    `reaching an overall score of ${overallText} with ${Math.round(input.completion)}% of ` +
    `the interview completed. Calculated result: ${input.statusLabel}. ${input.reason}`
  );
}
