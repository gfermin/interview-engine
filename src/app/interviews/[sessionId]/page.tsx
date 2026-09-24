import Link from "next/link";
import { notFound } from "next/navigation";
import { AppTopbar } from "@/components/layout/app-topbar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateSectionStatus } from "@/domain/interviews/section-status";
import { computeSessionScoring } from "@/domain/interviews/session-scoring";
import { STAGE_LABELS, type InterviewStage } from "@/domain/interviews/stage-config";
import type { QuestionScore } from "@/domain/scoring/types";
import { listCompetencies } from "@/features/templates/queries";
import { buildSessionEvaluationState, getSessionDetail } from "@/features/interviews/queries";
import { QuestionCard } from "@/features/interviews/question-card";
import { SectionNav } from "@/features/interviews/section-nav";

export const dynamic = "force-dynamic";

export default async function LiveInterviewPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const session = await getSessionDetail(sessionId);
  if (!session) notFound();

  const [competencies, { questions, evaluationByQuestionId, evaluationInputs }] = await Promise.all([
    listCompetencies(session.templateId),
    buildSessionEvaluationState(session.templateId, sessionId),
  ]);

  const scoring = computeSessionScoring(competencies, evaluationInputs, session.criticalMin);

  const questionsByCompetency = new Map<string, typeof questions>();
  for (const question of questions) {
    const list = questionsByCompetency.get(question.competencyId) ?? [];
    list.push(question);
    questionsByCompetency.set(question.competencyId, list);
  }

  const criticalByCompetencyId = new Map(
    scoring.criticalCompetencyStatus.map((status) => [status.competencyId, status])
  );

  const sections = competencies.map((competency) => {
    const stat = scoring.competencyStats.get(competency.id)!;
    const total = questionsByCompetency.get(competency.id)?.length ?? 0;
    return {
      id: competency.id,
      name: competency.name,
      status: calculateSectionStatus(total, stat, criticalByCompetencyId.get(competency.id) ?? null),
    };
  });

  const criticalTotal = scoring.criticalCompetencyStatus.length;
  const criticalConcerns = scoring.criticalCompetencyStatus.filter(
    (c) => c.hasEvidence && !c.meets
  ).length;

  return (
    <>
      <AppTopbar title={`${session.candidateName} — ${STAGE_LABELS[session.stage as InterviewStage]}`} />
      <main className="mx-auto flex w-full max-w-[840px] flex-1 flex-col gap-5 px-6 py-7">
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-[15px]">{session.candidateName}</CardTitle>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Link
                  href={`/candidates/${session.candidateId}`}
                  className="text-[12.5px] text-muted-foreground hover:underline"
                >
                  Back to candidate
                </Link>
                <Badge variant="secondary">{session.positionTitle}</Badge>
                <Badge variant="secondary">{STAGE_LABELS[session.stage as InterviewStage]}</Badge>
                <Badge variant="outline" className="font-mono">
                  v{session.templateVersion}
                </Badge>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge>Overall: {scoring.overall !== null ? `${Math.round(scoring.overall)}%` : "—"}</Badge>
              <Badge variant="secondary">Completion: {Math.round(scoring.completion)}%</Badge>
              {criticalTotal > 0 ? (
                <Badge variant={criticalConcerns > 0 ? "destructive" : "secondary"}>
                  Critical: {criticalConcerns} concern{criticalConcerns === 1 ? "" : "s"}
                </Badge>
              ) : null}
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[13.5px]">Sections</CardTitle>
          </CardHeader>
          <CardContent>
            <SectionNav sections={sections} />
          </CardContent>
        </Card>

        {competencies.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              This template has no competencies — nothing to evaluate.
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
                        Critical
                      </Badge>
                    ) : null}
                  </CardTitle>
                  <span className="text-[11px] text-muted-foreground">
                    {scoring.competencyStats.get(competency.id)?.percent !== null &&
                    scoring.competencyStats.get(competency.id)?.percent !== undefined
                      ? `${Math.round(scoring.competencyStats.get(competency.id)!.percent!)}%`
                      : "No evidence yet"}
                  </span>
                </CardHeader>
                <CardContent>
                  {competency.expectedDepth ? (
                    <p className="mb-3 text-[11.5px] text-muted-foreground">
                      Expected depth: {competency.expectedDepth}
                    </p>
                  ) : null}
                  {competencyQuestions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No questions in this competency.</p>
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
      </main>
    </>
  );
}
