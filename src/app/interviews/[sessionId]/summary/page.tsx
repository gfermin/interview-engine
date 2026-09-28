import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import {
  canDeleteSession,
  canGenerateReport,
  canReopenSession,
  isSessionDecided,
} from "@/domain/interviews/session-lifecycle";
import type { InterviewLanguage } from "@/domain/interviews/interview-language";
import { buildNarrative } from "@/domain/interviews/narrative";
import { categorizeCompetencies } from "@/domain/interviews/result-categories";
import { getStageConfig, type InterviewStage } from "@/domain/interviews/stage-config";
import {
  archiveSessionAction,
  deleteSessionAction,
  recordDecisionAction,
  reopenSessionAction,
  restoreSessionAction,
} from "@/features/interviews/actions";
import type { CompetencyDashboardEntry } from "@/features/interviews/competency-dashboard";
import { InterviewScoreboard } from "@/features/interviews/interview-scoreboard";
import {
  buildSessionEvaluationState,
  getDecision,
  getSessionDetail,
  getSupplementaryAssessment,
  listMandatoryRequirementEvaluations,
} from "@/features/interviews/queries";
import { computeFullScoringResult } from "@/features/interviews/scoring";
import { SummaryDecisionSection } from "@/features/interviews/summary-decision-section";
import { SummaryHeaderSection } from "@/features/interviews/summary-header-section";
import { SummaryMandatoryAndEnglishSection } from "@/features/interviews/summary-mandatory-english-section";
import { SummaryReportSection } from "@/features/interviews/summary-report-section";
import { SummaryScoreSection } from "@/features/interviews/summary-score-section";
import { getPosition } from "@/features/positions/queries";
import { deleteReportAction, generateReportAction } from "@/features/reports/actions";
import { listReportsForSession } from "@/features/reports/queries";
import { APP_LOCALE_COOKIE, resolveLocale } from "@/features/settings/locale";
import { listCompetencies, listMandatoryRequirements } from "@/features/templates/queries";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

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
        <SummaryHeaderSection
          sessionId={sessionId}
          candidateName={session.candidateName}
          positionTitle={session.positionTitle}
          stageLabel={stageConfig.label}
          templateVersion={session.templateVersion}
          createdAt={session.createdAt}
          isArchived={isArchived}
          canReopen={canReopenSession(session)}
          canDelete={deleteCheck}
          cannotDeleteNote={!deleteCheck}
          reopenAction={reopenSessionAction.bind(null, sessionId)}
          restoreAction={restoreSessionAction.bind(null, sessionId)}
          archiveAction={archiveSessionAction.bind(null, sessionId)}
          deleteAction={deleteSessionAction.bind(null, sessionId)}
          locale={locale}
        />

        <SummaryScoreSection
          stage={stage}
          overall={result.overall}
          completion={result.completion}
          reason={result.reason}
          recommendation={result.recommendation}
          includeCodeExercises={session.includeCodeExercises}
          dashboardEntries={dashboardEntries}
          strengths={categories.strengths}
          borderlineAreas={categories.borderlineAreas}
          concerns={categories.concerns}
          unratedCountByCompetency={unratedCountByCompetency}
          locale={locale}
        />

        <SummaryMandatoryAndEnglishSection
          sessionId={sessionId}
          mandatoryRequirements={mandatoryRequirements}
          mrStatusByRequirementId={mrStatusByRequirementId}
          isDecided={isSessionDecided(session)}
          showEnglishAssessment={stageConfig.modules.supplementaryAssessments}
          englishLevel={englishAssessment?.level ?? null}
          locale={locale}
        />

        <SummaryDecisionSection
          stage={stage}
          status={result.status}
          reason={result.reason}
          narrative={narrative}
          recordedDecision={recordedDecision}
          recordDecisionAction={recordDecisionAction.bind(null, sessionId)}
          locale={locale}
        />

        <SummaryReportSection
          sessionId={sessionId}
          candidateName={session.candidateName}
          positionTitle={session.positionTitle}
          stageLabel={stageConfig.label}
          reports={reports}
          canGenerate={canGenerateReport(session)}
          deleteReportAction={deleteReportAction}
          generateReportAction={generateReportAction.bind(null, sessionId)}
          locale={locale}
        />
      </PageContainer>
    </>
  );
}
