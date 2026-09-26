// Dashboard queries (plan Phase 15/§41 Task 15.1) — every count/list here is
// a read over tables that already exist; nothing new is persisted. Reuses
// Phase 11's `listSessions` filter plumbing rather than parallel query
// logic, and Phase 9's canonical `computeFullScoringResult` rather than a
// second scoring path, per the plan's own "UI and PDF should consume the
// same canonical result" principle (§34) extended here to the Dashboard.
import { and, eq, gte, isNull } from "drizzle-orm";
import { db } from "@/db";
import { interviewSessions } from "@/db/schema";
import type { InterviewStage } from "@/domain/interviews/stage-config";
import type { InterviewStatus } from "@/domain/scoring/types";
import { computeFullScoringResult } from "@/features/interviews/scoring";
import { listSessions } from "@/features/interviews/queries";
import { listDraftTemplates, listPublishedTemplates } from "@/features/templates/queries";

export { listPublishedTemplates as getActiveTemplates };

/** A session in progress for longer than this is flagged in "Attention
 * Required" (plan Phase 15/§41 Task 15.3) — an explicit, documented default
 * rather than a hidden magic number, since the artifact has no precedent for
 * "stale" and this is a judgment call. Revisit if real usage shows it's too
 * aggressive/lax. */
const STALE_IN_PROGRESS_HOURS = 48;

function startOfToday(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export interface DashboardCounts {
  interviewsToday: number;
  inProgress: number;
  awaitingDecision: number;
  completed: number;
}

/**
 * "Completed" here means `decided` — a human decision has been recorded,
 * the pipeline's terminal state — distinct from "Awaiting Decision"
 * (`completed`: rating finished, no decision yet). Both are named as
 * separate top-row tiles in the task's own dashboard sketch, which only
 * makes sense under this reading.
 */
export async function getDashboardCounts(): Promise<DashboardCounts> {
  // Archived sessions are excluded from every count (plan Phase 23/§44.9) —
  // an archived session is, by definition, no longer part of active work.
  const active = isNull(interviewSessions.archivedAt);
  const [today, inProgress, awaitingDecision, completed] = await Promise.all([
    db
      .select({ id: interviewSessions.id })
      .from(interviewSessions)
      .where(and(gte(interviewSessions.createdAt, startOfToday()), active)),
    db
      .select({ id: interviewSessions.id })
      .from(interviewSessions)
      .where(and(eq(interviewSessions.status, "in_progress"), active)),
    db
      .select({ id: interviewSessions.id })
      .from(interviewSessions)
      .where(and(eq(interviewSessions.status, "completed"), active)),
    db
      .select({ id: interviewSessions.id })
      .from(interviewSessions)
      .where(and(eq(interviewSessions.status, "decided"), active)),
  ]);

  return {
    interviewsToday: today.length,
    inProgress: inProgress.length,
    awaitingDecision: awaitingDecision.length,
    completed: completed.length,
  };
}

export interface RecentSessionRow {
  id: string;
  candidateName: string;
  positionTitle: string;
  stage: InterviewStage;
  status: "in_progress" | "completed" | "decided";
  createdAt: Date;
  overall: number | null;
  calculatedStatus: InterviewStatus;
}

/** Last N sessions across every candidate, each annotated with the same
 * canonical calculated score/status the live-rating and Summary screens
 * show — not a separate, cheaper approximation. */
export async function getRecentSessions(limit = 8): Promise<RecentSessionRow[]> {
  const rows = await listSessions().limit(limit);
  return Promise.all(
    rows.map(async (row) => {
      const result = await computeFullScoringResult(row.id, row.templateId);
      return {
        id: row.id,
        candidateName: row.candidateName,
        positionTitle: row.positionTitle,
        stage: row.stage,
        status: row.status,
        createdAt: row.createdAt,
        overall: result.overall,
        calculatedStatus: result.status,
      };
    })
  );
}

export type AttentionItemKind = "awaiting_decision" | "stale_in_progress" | "draft_template";

export interface AttentionItem {
  kind: AttentionItemKind;
  label: string;
  detail: string;
  href: string;
}

/** Everything in "what needs my attention" (plan Phase 15/§41 Task 15.3):
 * sessions finished rating but not yet decided (annotated with the
 * calculated status so a BORDERLINE one reads as more urgent), sessions
 * that have sat `in_progress` past {@link STALE_IN_PROGRESS_HOURS}, and
 * templates generated but never approved. */
export async function getAttentionItems(): Promise<AttentionItem[]> {
  const staleCutoff = new Date(Date.now() - STALE_IN_PROGRESS_HOURS * 60 * 60 * 1000);

  const [awaitingDecisionSessions, inProgressSessions, draftTemplates] = await Promise.all([
    listSessions({ status: "completed" }),
    listSessions({ status: "in_progress" }),
    listDraftTemplates(),
  ]);

  const items: AttentionItem[] = [];

  for (const session of awaitingDecisionSessions) {
    const result = await computeFullScoringResult(session.id, session.templateId);
    items.push({
      kind: "awaiting_decision",
      label: `${session.candidateName} — ${session.positionTitle}`,
      detail:
        result.status === "BORDERLINE"
          ? "Borderline — needs a forced Pass/Fail call"
          : `Calculated ${result.status}, no decision recorded yet`,
      href: `/interviews/${session.id}/summary`,
    });
  }

  for (const session of inProgressSessions) {
    if (session.createdAt >= staleCutoff) continue;
    items.push({
      kind: "stale_in_progress",
      label: `${session.candidateName} — ${session.positionTitle}`,
      detail: `In progress since ${session.createdAt.toLocaleDateString()}`,
      href: `/interviews/${session.id}`,
    });
  }

  for (const template of draftTemplates) {
    items.push({
      kind: "draft_template",
      label: `${template.positionTitle} — ${template.name}`,
      detail: "Draft — not yet published",
      href: `/templates/${template.id}`,
    });
  }

  return items;
}
