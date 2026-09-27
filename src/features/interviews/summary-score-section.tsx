import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InterviewStage } from "@/domain/interviews/stage-config";
import { statusLabelFor } from "@/domain/interviews/stage-config";
import type { Recommendation } from "@/domain/scoring/types";
import { t, type Locale } from "@/lib/i18n";
import { formatPercent } from "@/lib/utils";
import { CompetencyDashboard, type CompetencyDashboardEntry } from "./competency-dashboard";

const RESULT_LIST_CLASSES = {
  pass: "text-pass",
  borderline: "text-borderline",
  fail: "text-fail",
} as const;

/** The artifact's strengths/borderline/concerns categorization (plan Phase
 * 14 Task 14.5/§41) — an empty list reads as "no evidence yet" rather than
 * being hidden, so the interviewer can tell "nothing qualifies" apart from
 * "this section is missing." */
function ResultList({
  label,
  tone,
  items,
  locale,
}: {
  label: string;
  tone: keyof typeof RESULT_LIST_CLASSES;
  items: { competencyId: string; name: string; percent: number }[];
  locale: Locale;
}) {
  return (
    <div>
      <h4 className={`text-[11px] font-semibold tracking-wide uppercase ${RESULT_LIST_CLASSES[tone]}`}>{label}</h4>
      {items.length > 0 ? (
        <ul className="mt-1 flex flex-col gap-0.5 text-[12.5px]">
          {items.map((item) => (
            <li key={item.competencyId}>
              {item.name} — {formatPercent(item.percent)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-[12px] text-muted-foreground">{t(locale, "interview.insufficientEvidence")}</p>
      )}
    </div>
  );
}

interface CategorizedCompetency {
  competencyId: string;
  name: string;
  percent: number;
}

/** Score Breakdown + Competency Dashboard + strengths/borderline/concerns +
 * the borderline follow-up callout (plan Phase 34/AUDIT-021) — extracted
 * out of the Summary page's monolithic body alongside its sibling section
 * components. A pure markup/prop split, no behavior change. */
export function SummaryScoreSection({
  stage,
  overall,
  completion,
  reason,
  recommendation,
  includeCodeExercises,
  dashboardEntries,
  strengths,
  borderlineAreas,
  concerns,
  unratedCountByCompetency,
  locale,
}: {
  stage: InterviewStage;
  overall: number | null;
  completion: number;
  reason: string;
  recommendation: Recommendation;
  includeCodeExercises: boolean;
  dashboardEntries: CompetencyDashboardEntry[];
  strengths: CategorizedCompetency[];
  borderlineAreas: CategorizedCompetency[];
  concerns: CategorizedCompetency[];
  unratedCountByCompetency: Map<string, number>;
  locale: Locale;
}) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-[13.5px]">{t(locale, "interview.scoreBreakdownHeading")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-[12.5px] text-muted-foreground">{reason}</p>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-[11px] text-muted-foreground">{t(locale, "interview.overallLabel")}</dt>
              <dd className="font-mono text-sm">{formatPercent(overall)}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-muted-foreground">{t(locale, "interview.completionLabel")}</dt>
              <dd className="font-mono text-sm">{formatPercent(completion)}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-muted-foreground">{t(locale, "interview.recommendationLabel")}</dt>
              <dd className="text-sm">
                {recommendation === "REVIEW_REQUIRED"
                  ? t(locale, "interview.reviewRequired")
                  : recommendation
                    ? statusLabelFor(stage, recommendation)
                    : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-muted-foreground">{t(locale, "interview.codingExerciseLabel")}</dt>
              <dd className="text-sm">
                {stage === "technical" && includeCodeExercises
                  ? t(locale, "interview.codingExerciseIncludedValue")
                  : t(locale, "interview.codingExerciseNotIncludedValue")}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[13.5px]">{t(locale, "interview.competencyDashboardHeading")}</CardTitle>
        </CardHeader>
        <CardContent>
          <CompetencyDashboard entries={dashboardEntries} locale={locale} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[13.5px]">{t(locale, "interview.resultsHeading")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <ResultList label={t(locale, "interview.strongestAreas")} tone="pass" items={strengths} locale={locale} />
          <ResultList
            label={t(locale, "interview.borderlineAreasLabel")}
            tone="borderline"
            items={borderlineAreas}
            locale={locale}
          />
          <ResultList label={t(locale, "interview.areasOfConcern")} tone="fail" items={concerns} locale={locale} />
        </CardContent>
      </Card>

      {borderlineAreas.length > 0 ? (
        <Card className="border-borderline-border">
          <CardHeader>
            <CardTitle className="text-[13.5px] text-borderline">
              {t(locale, "interview.borderlineFollowupHeading")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-1.5 text-[12.5px]">
              {borderlineAreas.map((area) => (
                <li key={area.competencyId} className="flex items-center justify-between gap-2">
                  <span>
                    {area.name} — {formatPercent(area.percent)}
                  </span>
                  <span className="font-mono text-[11.5px] text-muted-foreground">
                    {unratedCountByCompetency.get(area.competencyId)
                      ? `${unratedCountByCompetency.get(area.competencyId)}${t(locale, "interview.unratedQuestionsSuffix")}`
                      : t(locale, "interview.noAdditionalQuestions")}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
