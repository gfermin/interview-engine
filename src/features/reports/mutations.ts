import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { db } from "@/db";
import { interviewReports } from "@/db/schema";
import { canGenerateReport } from "@/domain/interviews/session-lifecycle";
import type { InterviewLanguage } from "@/domain/interviews/interview-language";
import { buildNarrative } from "@/domain/interviews/narrative";
import { buildInterviewReportDisplayName, buildInterviewReportFilename } from "@/domain/reports/naming";
import { getStageConfig, type InterviewStage } from "@/domain/interviews/stage-config";
import { getCandidate } from "@/features/candidates/queries";
import {
  getDecision,
  getSession,
  getSessionDetail,
  getSupplementaryAssessment,
  listMandatoryRequirementEvaluations,
} from "@/features/interviews/queries";
import { computeFullScoringResult } from "@/features/interviews/scoring";
import { getPosition } from "@/features/positions/queries";
import { getTemplate, listCompetencies, listMandatoryRequirements } from "@/features/templates/queries";
import { buildReportHtml, type ReportData } from "@/services/pdf/report-template";
import { renderHtmlToPdf } from "@/services/pdf/render";

// Relative to the project root, matching src/db/index.ts's convention for
// the SQLite file path — Node resolves it against process.cwd(), which is
// the project root for both `next dev` and `next start`.
const REPORTS_DIR = ".data/reports";

/**
 * Generates a PDF report from a finalized (`decided`) InterviewSession
 * (plan §24) and persists an immutable `InterviewReport` record pointing at
 * it. Refuses outright on any earlier session status — there is no
 * `InterviewDecision` to report on yet, and the plan is explicit that a
 * report is only ever built from stored, decided data, never a live
 * screenshot or a report on an incomplete evaluation.
 */
export async function generateReport(sessionId: string) {
  const session = await getSession(sessionId);
  if (!session) throw new Error("Session not found.");
  if (!canGenerateReport(session)) {
    throw new Error("A report can only be generated once the session has a recorded decision.");
  }

  const sessionDetail = await getSessionDetail(sessionId);
  if (!sessionDetail) throw new Error("Session not found.");

  const stage = sessionDetail.stage as InterviewStage;
  const stageConfig = getStageConfig(stage);

  const [template, candidate, position, competencies, mandatoryRequirements, mrEvaluations, result, decisionRow, englishAssessment] =
    await Promise.all([
      getTemplate(sessionDetail.templateId),
      getCandidate(sessionDetail.candidateId),
      getPosition(sessionDetail.positionId),
      listCompetencies(sessionDetail.templateId),
      listMandatoryRequirements(sessionDetail.templateId),
      listMandatoryRequirementEvaluations(sessionId),
      computeFullScoringResult(sessionId, sessionDetail.templateId),
      getDecision(sessionId),
      stageConfig.modules.supplementaryAssessments
        ? getSupplementaryAssessment(sessionId, "english")
        : Promise.resolve(undefined),
    ]);

  if (!template) throw new Error("Template not found.");
  if (!decisionRow?.mode || !decisionRow.finalDecision) {
    // Guarded by canGenerateReport(session) above — a `decided` session
    // always has both fields set together (see recordDecision), so this is
    // an invariant check, not a real-world path.
    throw new Error("No decision recorded for this session.");
  }

  const mrStatusByRequirementId = new Map(mrEvaluations.map((row) => [row.requirementId, row.status]));
  const criticalByCompetencyId = new Map(result.criticalCompetencyStatus.map((c) => [c.competencyId, c]));
  const statusLabel = stageConfig.statusLabels[result.status];

  const interviewLanguage = sessionDetail.interviewLanguage as InterviewLanguage;

  const reportData: ReportData = {
    generatedAt: new Date(),
    language: interviewLanguage,
    candidateName: sessionDetail.candidateName,
    candidateEmail: candidate?.email ?? null,
    positionTitle: sessionDetail.positionTitle,
    roleFamily: position?.roleFamily ?? null,
    seniority: position?.seniority ?? null,
    stageLabel: stageConfig.label,
    templateName: sessionDetail.templateName,
    templateVersion: sessionDetail.templateVersion,
    statusLabel,
    overall: result.overall,
    completion: result.completion,
    reason: result.reason,
    competencies: competencies.map((c) => {
      const stat = result.competencyStats.find((s) => s.competencyId === c.id);
      const critical = criticalByCompetencyId.get(c.id);
      return {
        name: c.name,
        weight: c.weight,
        critical: c.critical,
        expectedDepth: c.expectedDepth,
        percent: stat?.percent ?? null,
        hasEvidence: critical?.hasEvidence ?? (stat?.evaluated ?? 0) > 0,
        meetsCriticalMin: critical?.meets ?? null,
      };
    }),
    mandatoryRequirements: mandatoryRequirements.map((r) => ({
      label: r.label,
      description: r.description,
      status: mrStatusByRequirementId.get(r.id) ?? "unknown",
    })),
    englishAssessment: stageConfig.modules.supplementaryAssessments
      ? {
          level: englishAssessment?.level ?? null,
          required: template.englishRequired,
          minLevel: template.englishMinLevel,
        }
      : null,
    decision: {
      mode: decisionRow.mode,
      finalDecision: decisionRow.finalDecision,
      reason: decisionRow.reason,
    },
    narrative: buildNarrative({
      candidateName: sessionDetail.candidateName,
      positionTitle: sessionDetail.positionTitle,
      seniority: position?.seniority ?? null,
      statusLabel,
      overall: result.overall,
      completion: result.completion,
      reason: result.reason,
      language: interviewLanguage,
    }),
  };

  const html = buildReportHtml(reportData);
  const pdf = await renderHtmlToPdf(html);

  const reportId = randomUUID();
  const filePath = `${REPORTS_DIR}/${reportId}.pdf`;
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, pdf);

  const namingInput = {
    candidateName: sessionDetail.candidateName,
    positionTitle: sessionDetail.positionTitle,
    stageLabel: stageConfig.label,
    generatedAt: reportData.generatedAt,
    reportId,
  };

  const [report] = await db
    .insert(interviewReports)
    .values({
      id: reportId,
      sessionId,
      filePath,
      fileSize: pdf.byteLength,
      displayName: buildInterviewReportDisplayName(namingInput),
      fileName: buildInterviewReportFilename(namingInput),
    })
    .returning();

  return report;
}
