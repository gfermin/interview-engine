// Pure section-nav status logic (plan §37/Phase 8) — ports the artifact's
// `statusIconFor()` concept: each Competency is a "section" in the live
// interview UI, and its nav entry shows one of four states. Nothing here
// imports from src/db or src/services (plan §15/§26); it operates on the
// same plain-data shapes ScoringEngine already produces (CompetencyStat,
// CriticalCompetencyStatus), so the page can derive section status without
// any new domain computation of its own.
import type { CompetencyStat, CriticalCompetencyStatus } from "@/domain/scoring/types";

export type SectionStatus = "not_started" | "in_progress" | "complete" | "critical_concern";

/**
 * `critical_concern` (⚠) takes precedence over completion — a critical
 * competency with evidence but failing its bar is the one state the artifact
 * always wants surfaced first, even if every question in it has technically
 * been answered (plan §19/§20: a knockout overrides everything else).
 */
export function calculateSectionStatus(
  totalQuestions: number,
  stat: Pick<CompetencyStat, "evaluated" | "na">,
  critical: Pick<CriticalCompetencyStatus, "hasEvidence" | "meets"> | null
): SectionStatus {
  if (critical && critical.hasEvidence && !critical.meets) return "critical_concern";

  const answered = stat.evaluated + stat.na;
  if (totalQuestions > 0 && answered >= totalQuestions) return "complete";
  if (answered > 0) return "in_progress";
  return "not_started";
}
