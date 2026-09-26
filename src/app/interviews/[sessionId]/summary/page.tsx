import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { LifecycleActionButton } from "@/components/lifecycle-action-button";
import { RowActionButton } from "@/components/row-action-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  canDeleteSession,
  canGenerateReport,
  canReopenSession,
  isSessionDecided,
} from "@/domain/interviews/session-lifecycle";
import { canRecordDecision } from "@/domain/interviews/decision";
import type { InterviewLanguage } from "@/domain/interviews/interview-language";
import { buildNarrative } from "@/domain/interviews/narrative";
import { categorizeCompetencies } from "@/domain/interviews/result-categories";
import { getStageConfig, statusLabelFor, type InterviewStage } from "@/domain/interviews/stage-config";
import type { MandatoryRequirementStatus } from "@/domain/scoring/types";
import {
  archiveSessionAction,
  deleteSessionAction,
  recordDecisionAction,
  reopenSessionAction,
  restoreSessionAction,
} from "@/features/interviews/actions";
import { CompetencyDashboard, type CompetencyDashboardEntry } from "@/features/interviews/competency-dashboard";
import { DecisionForm } from "@/features/interviews/decision-form";
import { EnglishAssessmentControl } from "@/features/interviews/english-assessment-control";
import { InterviewScoreboard } from "@/features/interviews/interview-scoreboard";
import { type BadgeTone, ToneBadge } from "@/features/interviews/status-badge";
import { MandatoryRequirementControl } from "@/features/interviews/mandatory-requirement-control";
import {
  buildSessionEvaluationState,
  getDecision,
  getSessionDetail,
  getSupplementaryAssessment,
  listMandatoryRequirementEvaluations,
} from "@/features/interviews/queries";
import { ReopenSessionButton } from "@/features/interviews/reopen-session-button";
import { computeFullScoringResult } from "@/features/interviews/scoring";
import { getPosition } from "@/features/positions/queries";
import { deleteReportAction, generateReportAction } from "@/features/reports/actions";
import { GenerateReportButton } from "@/features/reports/generate-report-button";
import { listReportsForSession } from "@/features/reports/queries";
import { APP_LOCALE_COOKIE, resolveLocale } from "@/features/settings/locale";
import { listCompetencies, listMandatoryRequirements } from "@/features/templates/queries";
import { t, type Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

// A MandatoryRequirement is a boolean knockout gate (plan §4.3/§19) — the
// same pass/fail/na color language the calculated interview status uses
// applies directly: met=pass, not_met=fail, unknown=na (no evidence yet,
// same as a critical competency with no evidence — not itself a failure).
const MANDATORY_STATUS_TONE: Record<MandatoryRequirementStatus, BadgeTone> = {
  met: "pass",
  not_met: "fail",
  unknown: "na",
};

function mandatoryStatusLabel(locale: Locale, status: MandatoryRequirementStatus): string {
  const key = status === "met" ? "mandatoryStatusMet" : status === "not_met" ? "mandatoryStatusNotMet" : "mandatoryStatusUnknown";
  return t(locale, `interview.${key}`);
}

export default async function InterviewSummaryPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(APP_LOCALE_COOKIE)?.value);

  const { sessionId } = await params;
  const session = await getSessionDetail(sessionId);
  if (!session) notFound();

  const stage = session.stage as InterviewStage;
  const stageConfig = getStageConfig(stage);
  const isArchived = Boolean(session.archivedAt);
  const deleteCheck = canDeleteSession(session);

  const [
    result,
    competencies,
    mandatoryRequirements,
    mrEvaluations,
    position,
    englishAssessment,
    decision,
    reports,
    { questions, evaluationByQuestionId },
  ] = await Promise.all([
    computeFullScoringResult(sessionId, session.templateId),
    listCompetencies(session.templateId),
    listMandatoryRequirements(session.templateId),
    listMandatoryRequirementEvaluations(sessionId),
    getPosition(session.positionId),
    stageConfig.modules.supplementaryAssessments
      ? getSupplementaryAssessment(sessionId, "english")
      : Promise.resolve(undefined),
    getDecision(sessionId),
    listReportsForSession(sessionId),
    buildSessionEvaluationState(session.templateId, sessionId),
  ]);

  // `interviewDecisions.mode`/`finalDecision` are nullable at the column
  // level (Phase 2 schema), but `recordDecision` (features/interviews/
  // mutations.ts) always writes both together — normalize here so the rest
  // of this page and DecisionForm work with a fully-typed decision or none.
  const recordedDecision =
    decision?.mode && decision.finalDecision
      ? { mode: decision.mode, finalDecision: decision.finalDecision, reason: decision.reason }
      : null;

  const mrStatusByRequirementId = new Map(mrEvaluations.map((row) => [row.requirementId, row.status]));
  const competencyStatById = new Map(result.competencyStats.map((stat) => [stat.competencyId, stat]));
  const criticalById = new Map(result.criticalCompetencyStatus.map((c) => [c.competencyId, c]));

  const statusLabel = stageConfig.statusLabels[result.status];
  const narrative = buildNarrative({
    candidateName: session.candidateName,
    positionTitle: session.positionTitle,
    seniority: position?.seniority ?? null,
    statusLabel,
    overall: result.overall,
    completion: result.completion,
    reason: result.reason,
    language: session.interviewLanguage as InterviewLanguage,
    stage,
  });

  const dashboardEntries: CompetencyDashboardEntry[] = competencies.map((competency) => {
    const stat = competencyStatById.get(competency.id);
    const critical = criticalById.get(competency.id);
    return {
      competencyId: competency.id,
      name: competency.name,
      weight: competency.weight,
      critical: competency.critical,
      percent: stat?.percent ?? null,
      evaluated: stat?.evaluated ?? 0,
      na: stat?.na ?? 0,
      criticalHasEvidence: critical?.hasEvidence ?? false,
      criticalMeets: critical?.meets ?? false,
      criticalMin: session.criticalMin,
    };
  });

  const categories = categorizeCompetencies(
    competencies.map((competency) => ({
      competencyId: competency.id,
      name: competency.name,
      percent: competencyStatById.get(competency.id)?.percent ?? null,
    })),
    { borderlineMin: session.borderlineMin, passThreshold: session.passThreshold }
  );

  const questionsByCompetency = new Map<string, typeof questions>();
  for (const question of questions) {
    const list = questionsByCompetency.get(question.competencyId) ?? [];
    list.push(question);
    questionsByCompetency.set(question.competencyId, list);
  }
  const unratedCountByCompetency = new Map(
    categories.borderlineAreas.map((area) => {
      const compQuestions = questionsByCompetency.get(area.competencyId) ?? [];
      const unrated = compQuestions.filter((question) => {
        const row = evaluationByQuestionId.get(question.id);
        return !row || (row.score === null && !row.isNa);
      }).length;
      return [area.competencyId, unrated] as const;
    })
  );

  return (
    <>
      <InterviewScoreboard
        candidateName={session.candidateName}
        subtitle={`${session.positionTitle} · ${stageConfig.label} · v${session.templateVersion} · ${t(locale, "interview.summaryLabel")}`}
        overall={result.overall}
        completion={result.completion}
        criticalMet={
          result.criticalCompetencyStatus.length -
          result.criticalCompetencyStatus.filter((c) => c.hasEvidence && !c.meets).length
        }
        criticalTotal={result.criticalCompetencyStatus.length}
        status={result.status}
        statusLabel={statusLabel}
        borderlineMin={session.borderlineMin}
        passThreshold={session.passThreshold}
        englishLevel={stageConfig.modules.supplementaryAssessments ? (englishAssessment?.level ?? null) : undefined}
        locale={locale}
      />
      <PageContainer width="full">
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-[15px]">{session.candidateName}</CardTitle>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Link
                  href={`/interviews/${sessionId}`}
                  className="text-[12.5px] text-muted-foreground hover:underline"
                >
                  {t(locale, "interview.backToRating")}
                </Link>
                <Badge variant="secondary">{session.positionTitle}</Badge>
                <Badge variant="secondary">{stageConfig.label}</Badge>
                <Badge variant="outline" className="font-mono">
                  v{session.templateVersion}
                </Badge>
                {isArchived ? (
                  <Badge variant="outline">{t(locale, "interview.archivedBadge")}</Badge>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap items-start gap-2">
              {canReopenSession(session) ? (
                <ReopenSessionButton action={reopenSessionAction.bind(null, sessionId)} locale={locale} />
              ) : null}
              {isArchived ? (
                <LifecycleActionButton
                  action={restoreSessionAction.bind(null, sessionId)}
                  label={t(locale, "interview.restoreSessionButton")}
                  icon={<ArchiveRestore />}
                />
              ) : (
                <>
                  <LifecycleActionButton
                    action={archiveSessionAction.bind(null, sessionId)}
                    label={t(locale, "interview.archiveSessionButton")}
                    icon={<Archive />}
                    confirmMessage={t(locale, "interview.archiveSessionConfirm")}
                  />
                  {deleteCheck ? (
                    <LifecycleActionButton
                      action={deleteSessionAction.bind(null, sessionId)}
                      label={t(locale, "interview.deleteSessionButton")}
                      icon={<Trash2 />}
                      variant="destructive"
                      confirmMessage={`${t(locale, "interview.deleteSessionConfirmPrefix")}${session.candidateName}${t(locale, "interview.deleteSessionConfirmSuffix")}`}
                    />
                  ) : null}
                </>
              )}
            </div>
          </CardHeader>
          {!isArchived && !deleteCheck ? (
            <CardContent className="pt-0">
              <p className="text-[11.5px] text-muted-foreground">
                {t(locale, "interview.cannotDeleteSessionNote")}
              </p>
            </CardContent>
          ) : null}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[13.5px]">{t(locale, "interview.scoreBreakdownHeading")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-[12.5px] text-muted-foreground">{result.reason}</p>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-[11px] text-muted-foreground">{t(locale, "interview.overallLabel")}</dt>
                <dd className="font-mono text-sm">
                  {result.overall !== null ? `${Math.round(result.overall)}%` : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-muted-foreground">{t(locale, "interview.completionLabel")}</dt>
                <dd className="font-mono text-sm">{Math.round(result.completion)}%</dd>
              </div>
              <div>
                <dt className="text-[11px] text-muted-foreground">{t(locale, "interview.recommendationLabel")}</dt>
                <dd className="text-sm">
                  {result.recommendation === "REVIEW_REQUIRED"
                    ? t(locale, "interview.reviewRequired")
                    : result.recommendation
                      ? statusLabelFor(stage, result.recommendation)
                      : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-muted-foreground">{t(locale, "interview.codingExerciseLabel")}</dt>
                <dd className="text-sm">
                  {stage === "technical" && session.includeCodeExercises
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
            <ResultList
              label={t(locale, "interview.strongestAreas")}
              tone="pass"
              items={categories.strengths}
              locale={locale}
            />
            <ResultList
              label={t(locale, "interview.borderlineAreasLabel")}
              tone="borderline"
              items={categories.borderlineAreas}
              locale={locale}
            />
            <ResultList
              label={t(locale, "interview.areasOfConcern")}
              tone="fail"
              items={categories.concerns}
              locale={locale}
            />
          </CardContent>
        </Card>

        {categories.borderlineAreas.length > 0 ? (
          <Card className="border-borderline-border">
            <CardHeader>
              <CardTitle className="text-[13.5px] text-borderline">
                {t(locale, "interview.borderlineFollowupHeading")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-1.5 text-[12.5px]">
                {categories.borderlineAreas.map((area) => (
                  <li key={area.competencyId} className="flex items-center justify-between gap-2">
                    <span>
                      {area.name} — {Math.round(area.percent)}%
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

        <Card>
          <CardHeader>
            <CardTitle className="text-[13.5px]">{t(locale, "interview.mandatoryRequirementsHeading")}</CardTitle>
          </CardHeader>
          <CardContent>
            {mandatoryRequirements.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t(locale, "interview.noMandatoryRequirementsNote")}
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {mandatoryRequirements.map((requirement) => (
                  <li
                    key={requirement.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                  >
                    <div>
                      <p className="text-[12.5px] font-medium">{requirement.label}</p>
                      {requirement.description ? (
                        <p className="text-[11.5px] text-muted-foreground">{requirement.description}</p>
                      ) : null}
                    </div>
                    {isSessionDecided(session) ? (
                      <ToneBadge
                        tone={MANDATORY_STATUS_TONE[mrStatusByRequirementId.get(requirement.id) ?? "unknown"]}
                        label={mandatoryStatusLabel(locale, mrStatusByRequirementId.get(requirement.id) ?? "unknown")}
                      />
                    ) : (
                      <MandatoryRequirementControl
                        sessionId={sessionId}
                        requirementId={requirement.id}
                        currentStatus={mrStatusByRequirementId.get(requirement.id) ?? "unknown"}
                        locale={locale}
                      />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {stageConfig.modules.supplementaryAssessments ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-[13.5px]">{t(locale, "interview.englishAssessmentHeading")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <p className="text-[11.5px] text-muted-foreground">
                {t(locale, "interview.englishAssessmentNote")}
              </p>
              {isSessionDecided(session) ? (
                <Badge variant="outline" className="w-fit">
                  {t(locale, "interview.levelPrefix")}
                  {englishAssessment?.level ?? t(locale, "interview.notAssessed")}
                </Badge>
              ) : (
                <EnglishAssessmentControl sessionId={sessionId} currentLevel={englishAssessment?.level ?? null} />
              )}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-[13.5px]">{t(locale, "interview.narrativeSummaryHeading")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="rounded-lg border border-border bg-muted/40 p-3 text-[12.5px] leading-relaxed">
              {narrative}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[13.5px]">{t(locale, "interview.decisionHeading")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {recordedDecision ? (
              <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-muted/40 p-3 text-[12.5px]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{t(locale, "interview.recordedLabel")}</span>
                  <ToneBadge
                    tone={recordedDecision.finalDecision === "PASS" ? "pass" : "fail"}
                    label={statusLabelFor(stage, recordedDecision.finalDecision)}
                  />
                  <span className="text-muted-foreground">({recordedDecision.mode.replace("_", " ")})</span>
                </div>
                {recordedDecision.reason ? (
                  <p className="text-muted-foreground">{recordedDecision.reason}</p>
                ) : null}
              </div>
            ) : null}

            {canRecordDecision(result.status) ? (
              <DecisionForm
                // Forces a clean remount when the calculated status changes
                // (e.g. after a Reopen + re-rate) — see the note in
                // decision-form.tsx (§40.1) for why this can't just rely on
                // useState's initial-value guard alone.
                key={result.status}
                action={recordDecisionAction.bind(null, sessionId)}
                status={result.status}
                stage={stage}
                existingDecision={recordedDecision}
                locale={locale}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                {result.reason}
                {t(locale, "interview.decisionPendingPrefix")}
                {statusLabelFor(stage, "PASS")}
                {t(locale, "interview.decisionPendingSeparator")}
                {statusLabelFor(stage, "FAIL")}
                {t(locale, "interview.decisionPendingOr")}
                {statusLabelFor(stage, "BORDERLINE")}
                {t(locale, "interview.decisionPendingSuffix")}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[13.5px]">{t(locale, "interview.reportHeading")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {reports.length > 0 ? (
              <ul className="flex flex-col gap-1.5">
                {reports.map((report) => (
                  <li
                    key={report.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-[12.5px]"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">
                        {report.displayName ?? `${session.candidateName} — ${session.positionTitle} — ${stageConfig.label}`}
                      </span>
                      <span className="text-muted-foreground">
                        {t(locale, "interview.reportGenerated")}{" "}
                        <span className="font-mono">{report.createdAt.toLocaleString(locale)}</span> (
                        <span className="font-mono">{Math.round(report.fileSize / 1024)} KB</span>)
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <a
                        href={`/api/reports/${report.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {t(locale, "interview.downloadLabel")}
                      </a>
                      <RowActionButton
                        action={deleteReportAction.bind(null, report.id, sessionId)}
                        icon={<Trash2 />}
                        label={t(locale, "interview.deleteReportButton")}
                        confirmMessage={t(locale, "interview.deleteReportConfirm")}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}

            {canGenerateReport(session) ? (
              <GenerateReportButton action={generateReportAction.bind(null, sessionId)} locale={locale} />
            ) : (
              <p className="text-sm text-muted-foreground">{t(locale, "interview.reportPendingNote")}</p>
            )}
          </CardContent>
        </Card>
      </PageContainer>
    </>
  );
}

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
              {item.name} — {Math.round(item.percent)}%
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-[12px] text-muted-foreground">{t(locale, "interview.insufficientEvidence")}</p>
      )}
    </div>
  );
}
