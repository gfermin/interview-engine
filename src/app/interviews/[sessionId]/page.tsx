import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateSectionStatus } from "@/domain/interviews/section-status";
import { canReopenSession, isSessionEditable, SESSION_STATUS_LABELS } from "@/domain/interviews/session-lifecycle";
import { getStageConfig, STAGE_LABELS, type InterviewStage } from "@/domain/interviews/stage-config";
import type { QuestionScore } from "@/domain/scoring/types";
import { listCompetencies } from "@/features/templates/queries";
import { finishRatingAction, reopenSessionAction } from "@/features/interviews/actions";
import { buildSessionEvaluationState, getSessionDetail, getSupplementaryAssessment } from "@/features/interviews/queries";
import { InterviewScoreboard } from "@/features/interviews/interview-scoreboard";
import { QuestionCard } from "@/features/interviews/question-card";
import { ReopenSessionButton } from "@/features/interviews/reopen-session-button";
import { computeFullScoringResult } from "@/features/interviews/scoring";
import { SectionNav } from "@/features/interviews/section-nav";
import { APP_LOCALE_COOKIE, resolveLocale } from "@/features/settings/locale";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function LiveInterviewPage({
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

  const [competencies, { questions, evaluationByQuestionId }, result, englishAssessment] = await Promise.all([
    listCompetencies(session.templateId),
    buildSessionEvaluationState(session.templateId, sessionId),
    // Same canonical calculation the Summary screen uses (plan §34): with no
    // mandatory-requirement evaluations recorded yet, a template that has
    // any correctly resolves to PROVISIONAL rather than a premature PASS —
    // see calculate()'s "not all mandatory requirements evaluated" branch.
    computeFullScoringResult(sessionId, session.templateId),
    stageConfig.modules.supplementaryAssessments
      ? getSupplementaryAssessment(sessionId, "english")
      : Promise.resolve(undefined),
  ]);

  const competencyStatById = new Map(result.competencyStats.map((stat) => [stat.competencyId, stat]));
  const criticalByCompetencyId = new Map(
    result.criticalCompetencyStatus.map((status) => [status.competencyId, status])
  );

  const questionsByCompetency = new Map<string, typeof questions>();
  for (const question of questions) {
    const list = questionsByCompetency.get(question.competencyId) ?? [];
    list.push(question);
    questionsByCompetency.set(question.competencyId, list);
  }

  const sections = competencies.map((competency) => {
    const stat = competencyStatById.get(competency.id)!;
    const total = questionsByCompetency.get(competency.id)?.length ?? 0;
    return {
      id: competency.id,
      name: competency.name,
      status: calculateSectionStatus(total, stat, criticalByCompetencyId.get(competency.id) ?? null),
    };
  });

  const criticalTotal = result.criticalCompetencyStatus.length;
  const criticalConcerns = result.criticalCompetencyStatus.filter(
    (c) => c.hasEvidence && !c.meets
  ).length;

  const editable = isSessionEditable(session);

  return (
    <>
      <InterviewScoreboard
        candidateName={session.candidateName}
        subtitle={`${session.positionTitle} · ${STAGE_LABELS[stage]} · v${session.templateVersion}`}
        overall={result.overall}
        completion={result.completion}
        criticalMet={criticalTotal - criticalConcerns}
        criticalTotal={criticalTotal}
        status={result.status}
        statusLabel={stageConfig.statusLabels[result.status]}
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
                  href={`/candidates/${session.candidateId}`}
                  className="text-[12.5px] text-muted-foreground hover:underline"
                >
                  {t(locale, "interview.backToCandidate")}
                </Link>
                <Badge variant="secondary">{session.positionTitle}</Badge>
                <Badge variant="secondary">{STAGE_LABELS[stage]}</Badge>
                <Badge variant="outline" className="font-mono">
                  v{session.templateVersion}
                </Badge>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {editable ? (
                <form action={finishRatingAction.bind(null, sessionId)}>
                  <Button type="submit" size="sm" variant="outline">
                    {t(locale, "interview.viewSummary")}
                  </Button>
                </form>
              ) : (
                <ButtonLink size="sm" variant="outline" href={`/interviews/${sessionId}/summary`}>
                  {t(locale, "interview.viewSummary")}
                </ButtonLink>
              )}
            </div>
          </CardHeader>
        </Card>

        {!editable ? (
          <Card>
            <CardContent className="flex items-center justify-between gap-2 p-4">
              <p className="text-[12.5px] text-muted-foreground">
                {t(locale, "interview.finishedBannerPrefix")}
                {SESSION_STATUS_LABELS[session.status]}
                {t(locale, "interview.finishedBannerSuffix")}
              </p>
              {canReopenSession(session) ? (
                <ReopenSessionButton action={reopenSessionAction.bind(null, sessionId)} locale={locale} />
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-[13.5px]">{t(locale, "interview.sectionsHeading")}</CardTitle>
          </CardHeader>
          <CardContent>
            <SectionNav sections={sections} />
          </CardContent>
        </Card>

        {competencies.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              {t(locale, "interview.noCompetencies")}
            </CardContent>
          </Card>
        ) : (
          competencies.map((competency) => {
            const competencyQuestions = questionsByCompetency.get(competency.id) ?? [];
            return (
              <Card key={competency.id} id={`comp-${competency.id}`}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-[13.5px]">
                    {competency.name}
                    {competency.critical ? (
                      <Badge variant="destructive" className="ml-2 align-middle">
                        {t(locale, "interview.criticalBadge")}
                      </Badge>
                    ) : null}
                  </CardTitle>
                  <span className="text-[11px] text-muted-foreground">
                    {competencyStatById.get(competency.id)?.percent !== null &&
                    competencyStatById.get(competency.id)?.percent !== undefined
                      ? `${Math.round(competencyStatById.get(competency.id)!.percent!)}%`
                      : t(locale, "interview.noEvidenceYet")}
                  </span>
                </CardHeader>
                <CardContent>
                  {competency.expectedDepth ? (
                    <p className="mb-3 text-[11.5px] text-muted-foreground">
                      {t(locale, "interview.expectedDepthPrefix")}
                      {competency.expectedDepth}
                    </p>
                  ) : null}
                  {competencyQuestions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {t(locale, "interview.noQuestionsInCompetency")}
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {competencyQuestions.map((question) => {
                        const row = evaluationByQuestionId.get(question.id);
                        const currentValue: QuestionScore = row?.isNa
                          ? "na"
                          : ((row?.score as QuestionScore | undefined) ?? null);
                        return (
                          <QuestionCard
                            key={question.id}
                            sessionId={sessionId}
                            question={question}
                            currentValue={currentValue}
                            notes={row?.notes ?? null}
                            editable={editable}
                            locale={locale}
                          />
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </PageContainer>
    </>
  );
}
