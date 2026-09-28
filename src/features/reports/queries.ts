import { and, desc, eq, like, or } from "drizzle-orm";
import { db } from "@/db";
import {
  candidates,
  interviewDecisions,
  interviewReports,
  interviewSessions,
  interviewTemplates,
  positions,
} from "@/db/schema";
import { buildInterviewReportDisplayName } from "@/domain/reports/naming";
import { getStageConfig, type InterviewStage } from "@/domain/interviews/stage-config";
import type { InterviewStatus } from "@/domain/scoring/types";

export function listReportsForSession(sessionId: string) {
  return db.query.interviewReports.findMany({
    where: eq(interviewReports.sessionId, sessionId),
    orderBy: [desc(interviewReports.createdAt)],
  });
}

export function getReport(id: string) {
  return db.query.interviewReports.findFirst({ where: eq(interviewReports.id, id) });
}

export interface ReportListFilters {
  search?: string;
  stage?: InterviewStage;
  /** Plan Phase 31/AUDIT-018 — see the identical note in
   * interviews/queries.ts's listSessions. */
  limit?: number;
  offset?: number;
}

export interface ReportListEntry {
  id: string;
  createdAt: Date;
  fileSize: number;
  displayName: string;
  fileName: string | null;
  sessionId: string;
  candidateId: string;
  candidateName: string;
  positionId: string;
  positionTitle: string;
  stage: InterviewStage;
  stageLabel: string;
  templateId: string;
  templateVersion: number;
  overall: number | null;
  calculatedStatus: InterviewStatus | null;
  statusLabel: string | null;
  finalDecision: "PASS" | "FAIL" | null;
  finalDecisionLabel: string | null;
}

/**
 * The Reports Hub (plan Phase 18/§42) — every generated report across every
 * candidate, joined with the finalized decision it was built from (never
 * recomputed independently, per plan §11). `search` matches candidate name
 * or position title; `stage` is an exact filter, mirroring the existing
 * Interview History list's filter shape (features/interviews/queries.ts
 * `listSessions`) rather than inventing a different filtering convention.
 */
export async function listAllReports(filters: ReportListFilters = {}): Promise<ReportListEntry[]> {
  const search = filters.search?.trim();
  const conditions = [
    search ? or(like(candidates.name, `%${search}%`), like(positions.title, `%${search}%`)) : undefined,
    filters.stage ? eq(interviewTemplates.stage, filters.stage) : undefined,
  ].filter((c) => c !== undefined);

  const rows = await db
    .select({
      id: interviewReports.id,
      createdAt: interviewReports.createdAt,
      fileSize: interviewReports.fileSize,
      displayName: interviewReports.displayName,
      fileName: interviewReports.fileName,
      sessionId: interviewSessions.id,
      candidateId: candidates.id,
      candidateName: candidates.name,
      positionId: positions.id,
      positionTitle: positions.title,
      stage: interviewTemplates.stage,
      templateId: interviewTemplates.id,
      templateVersion: interviewTemplates.version,
      calculatedStatus: interviewDecisions.calculatedStatus,
      finalDecision: interviewDecisions.finalDecision,
      overall: interviewDecisions.overall,
    })
    .from(interviewReports)
    .innerJoin(interviewSessions, eq(interviewReports.sessionId, interviewSessions.id))
    .innerJoin(candidates, eq(interviewSessions.candidateId, candidates.id))
    .innerJoin(interviewTemplates, eq(interviewSessions.templateId, interviewTemplates.id))
    .innerJoin(positions, eq(interviewTemplates.positionId, positions.id))
    .leftJoin(interviewDecisions, eq(interviewDecisions.sessionId, interviewSessions.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(interviewReports.createdAt))
    .limit(filters.limit ?? -1)
    .offset(filters.offset ?? 0);

  // Plan Phase 29/AUDIT-005/AUDIT-006 — `overall` is read from the decision
  // row itself (the immutable decision-time snapshot `recordDecision`
  // persists), not recomputed live. Recomputing risked the Reports Hub
  // showing a percentage that visually contradicts the decision badge on
  // the same row if a Reopen ever changed a rating without a corresponding
  // re-decide — safe only because several separately-tested guards happened
  // to hold together, not because of a direct invariant.
  return rows.map((row) => {
    const stage = row.stage as InterviewStage;
    const stageConfig = getStageConfig(stage);
    const calculatedStatus = row.calculatedStatus as InterviewStatus | null;
    return {
      ...row,
      stage,
      stageLabel: stageConfig.label,
      // Reports generated before the naming columns existed (plan §42
      // migration note) have no stored `displayName` — computed live from
      // this same joined row rather than requiring a backfill.
      displayName:
        row.displayName ??
        buildInterviewReportDisplayName({
          candidateName: row.candidateName,
          positionTitle: row.positionTitle,
          stageLabel: stageConfig.label,
          generatedAt: row.createdAt,
          reportId: row.id,
        }),
      calculatedStatus,
      statusLabel: calculatedStatus ? stageConfig.statusLabels[calculatedStatus] : null,
      finalDecisionLabel: row.finalDecision ? stageConfig.statusLabels[row.finalDecision] : null,
    };
  });
}
