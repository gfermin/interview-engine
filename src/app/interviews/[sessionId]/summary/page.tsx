import Link from "next/link";
import { notFound } from "next/navigation";
import { AppTopbar } from "@/components/layout/app-topbar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { canRecordDecision } from "@/domain/interviews/decision";
import { buildNarrative } from "@/domain/interviews/narrative";
import { getStageConfig, type InterviewStage } from "@/domain/interviews/stage-config";
import type { InterviewStatus } from "@/domain/scoring/types";
import { recordDecisionAction } from "@/features/interviews/actions";
import { DecisionForm } from "@/features/interviews/decision-form";
import { EnglishAssessmentControl } from "@/features/interviews/english-assessment-control";
import { MandatoryRequirementControl } from "@/features/interviews/mandatory-requirement-control";
import {
  getDecision,
  getSessionDetail,
  getSupplementaryAssessment,
  listMandatoryRequirementEvaluations,
} from "@/features/interviews/queries";
import { computeFullScoringResult } from "@/features/interviews/scoring";
import { getPosition } from "@/features/positions/queries";
import { listCompetencies, listMandatoryRequirements } from "@/features/templates/queries";

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<InterviewStatus, "default" | "secondary" | "destructive" | "outline"> = {
  NOT_EVALUATED: "outline",
  PROVISIONAL: "outline",
  FAIL: "destructive",
  BORDERLINE: "secondary",
  PASS: "default",
};

export default async function InterviewSummaryPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const session = await getSessionDetail(sessionId);
  if (!session) notFound();

  const stage = session.stage as InterviewStage;
  const stageConfig = getStageConfig(stage);

  const [result, competencies, mandatoryRequirements, mrEvaluations, position, englishAssessment, decision] =
    await Promise.all([
      computeFullScoringResult(sessionId, session.templateId),
      listCompetencies(session.templateId),
      listMandatoryRequirements(session.templateId),
      listMandatoryRequirementEvaluations(sessionId),
      getPosition(session.positionId),
      stageConfig.modules.supplementaryAssessments
        ? getSupplementaryAssessment(sessionId, "english")
        : Promise.resolve(undefined),
      getDecision(sessionId),
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
  });

  return (
    <>
      <AppTopbar title={`${session.candidateName} — Summary`} />
      <main className="mx-auto flex w-full max-w-[840px] flex-1 flex-col gap-5 px-6 py-7">
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-[15px]">{session.candidateName}</CardTitle>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Link
                  href={`/interviews/${sessionId}`}
                  className="text-[12.5px] text-muted-foreground hover:underline"
                >
                  Back to rating
                </Link>
                <Badge variant="secondary">{session.positionTitle}</Badge>
                <Badge variant="secondary">{stageConfig.label}</Badge>
                <Badge variant="outline" className="font-mono">
                  v{session.templateVersion}
                </Badge>
              </div>
            </div>
            <Badge variant={STATUS_VARIANT[result.status]} className="text-[13px]">
              {statusLabel}
            </Badge>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[13.5px]">Score Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-[12.5px] text-muted-foreground">{result.reason}</p>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-[11px] text-muted-foreground">Overall</dt>
                <dd className="font-mono text-sm">
                  {result.overall !== null ? `${Math.round(result.overall)}%` : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-muted-foreground">Completion</dt>
                <dd className="font-mono text-sm">{Math.round(result.completion)}%</dd>
              </div>
              <div>
                <dt className="text-[11px] text-muted-foreground">Recommendation</dt>
                <dd className="font-mono text-sm">{result.recommendation ?? "—"}</dd>
              </div>
            </dl>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {competencies.map((competency) => {
                const stat = competencyStatById.get(competency.id);
                const critical = criticalById.get(competency.id);
                return (
                  <div
                    key={competency.id}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12.5px]">{competency.name}</span>
                      {competency.critical ? (
                        <Badge
                          variant={critical && critical.hasEvidence && !critical.meets ? "destructive" : "outline"}
                        >
                          Critical
                        </Badge>
                      ) : null}
                    </div>
                    <span className="font-mono text-[12.5px] text-muted-foreground">
                      {stat?.percent !== null && stat?.percent !== undefined
                        ? `${Math.round(stat.percent)}%`
                        : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[13.5px]">Mandatory Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            {mandatoryRequirements.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                This template has no mandatory requirements — the PASS/FAIL gate here is
                purely competency-driven.
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
                    <MandatoryRequirementControl
                      sessionId={sessionId}
                      requirementId={requirement.id}
                      currentStatus={mrStatusByRequirementId.get(requirement.id) ?? "unknown"}
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {stageConfig.modules.supplementaryAssessments ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-[13.5px]">English Assessment</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <p className="text-[11.5px] text-muted-foreground">
                Optional supplementary module — only gates the decision if the template
                marks it required.
              </p>
              <EnglishAssessmentControl sessionId={sessionId} currentLevel={englishAssessment?.level ?? null} />
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-[13.5px]">Narrative Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="rounded-lg border border-border bg-muted/40 p-3 text-[12.5px] leading-relaxed">
              {narrative}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[13.5px]">Decision</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {recordedDecision ? (
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-[12.5px]">
                <p>
                  <span className="font-medium">Recorded: </span>
                  {recordedDecision.finalDecision} ({recordedDecision.mode.replace("_", " ")})
                </p>
                {recordedDecision.reason ? (
                  <p className="mt-1 text-muted-foreground">{recordedDecision.reason}</p>
                ) : null}
              </div>
            ) : null}

            {canRecordDecision(result.status) ? (
              <DecisionForm
                action={recordDecisionAction.bind(null, sessionId)}
                status={result.status}
                existingDecision={recordedDecision}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                {result.reason} A decision can be recorded once the interview reaches a
                PASS, FAIL, or BORDERLINE calculated result.
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
