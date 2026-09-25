// Ports the artifact's results categorization (plan Phase 14 Task 14.5/§41,
// artifact `renderSummary()`/`buildReportText()`): every competency with
// evidence falls into exactly one of strengths (>=80%), borderline areas
// (in the configured borderline-to-pass band), or concerns (<borderlineMin).
// A competency with no evidence yet appears in none of the three lists —
// same "no evidence ≠ concern" principle the scoring engine itself follows.
// Pure: no imports from src/db or src/services (plan §15/§26).

export interface CompetencyPercent {
  competencyId: string;
  name: string;
  percent: number | null;
}

/** The three result lists only ever hold competencies *with* evidence
 * (percent narrowed to `number`) — a competency with no evidence yet
 * appears in none of them, so callers never need to null-check here. */
export interface CategorizedCompetency {
  competencyId: string;
  name: string;
  percent: number;
}

export interface ResultCategories {
  strengths: CategorizedCompetency[];
  borderlineAreas: CategorizedCompetency[];
  concerns: CategorizedCompetency[];
}

const STRENGTH_MIN = 80;

export function categorizeCompetencies(
  competencies: CompetencyPercent[],
  config: { borderlineMin: number; passThreshold: number }
): ResultCategories {
  const withEvidence = competencies.filter(
    (c): c is CompetencyPercent & { percent: number } => c.percent !== null
  );

  const strengths = withEvidence.filter((c) => c.percent >= STRENGTH_MIN);
  const concerns = withEvidence.filter((c) => c.percent < config.borderlineMin);
  const borderlineAreas = withEvidence
    .filter((c) => c.percent >= config.borderlineMin && c.percent < config.passThreshold)
    .sort((a, b) => a.percent - b.percent);

  return { strengths, borderlineAreas, concerns };
}
