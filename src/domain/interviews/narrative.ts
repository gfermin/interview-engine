// A plain template-string narrative (plan §17: "a generalization of the
// artifact's buildNarrative(), currently template-string-based") — not an
// AI call. Pure function: plain data in, one paragraph of text out.
//
// Localized (plan Phase 21/§28) by composing fixed sentence fragments from
// the `interview` namespace rather than embedding an interpolation engine —
// `lib/i18n.ts`'s `t()` only does flat key lookup, so the sentence is built
// the same way dashboard.ts's link-embedding empty-states are: literal
// prefix/suffix keys around each interpolated value. `reason` itself (the
// ScoringEngine's own explanation string) is deliberately NOT translated
// here — it's core domain output, not narrative-layer copy, and stays
// English regardless of `language` (see report-template.ts's same
// boundary for `data.reason`).
import type { InterviewLanguage } from "./interview-language";
import type { InterviewStage } from "./stage-config";
import { t } from "@/lib/i18n";

export interface NarrativeInput {
  candidateName: string;
  positionTitle: string;
  seniority: string | null;
  statusLabel: string;
  overall: number | null;
  completion: number;
  reason: string;
  language: InterviewLanguage;
  /** Plan Phase 22/§43.18: a First Screening narrative must never read as a
   * technical certification. Optional (defaults to no disclaimer) so
   * existing callers/tests that predate this stage-awareness keep working
   * unchanged. */
  stage?: InterviewStage;
}

export function buildNarrative(input: NarrativeInput): string {
  const lang = input.language;
  const overallText =
    input.overall !== null ? `${Math.round(input.overall)}%` : t(lang, "interview.narrativeNotYetScoreable");
  const seniorityText = input.seniority
    ? `${t(lang, "interview.narrativeAtRequestedLevelPrefix")}${input.seniority}${t(lang, "interview.narrativeAtRequestedLevelSuffix")}`
    : "";
  const screeningDisclaimer =
    input.stage === "screening" ? t(lang, "interview.narrativeScreeningDisclaimer") : "";

  return (
    `${input.candidateName}${t(lang, "interview.narrativeEvaluatedFor")}${input.positionTitle}${seniorityText}` +
    `${t(lang, "interview.narrativeReachingScore")}${overallText}${t(lang, "interview.narrativeWithCompletionPrefix")}${Math.round(input.completion)}` +
    `${t(lang, "interview.narrativeCompletionSuffix")}${input.statusLabel}${t(lang, "interview.narrativeSentenceEnd")}${input.reason}${screeningDisclaimer}`
  );
}
