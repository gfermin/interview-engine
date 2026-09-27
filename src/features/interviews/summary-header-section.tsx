import Link from "next/link";
import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { LifecycleActionButton } from "@/components/lifecycle-action-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InterviewStage } from "@/domain/interviews/stage-config";
import { t, type Locale } from "@/lib/i18n";
import { ReopenSessionButton } from "./reopen-session-button";

/** The Summary screen's header Card (plan Phase 34/AUDIT-021) — candidate
 * identity, position/stage/version/date badges, and the
 * Reopen/Archive/Restore/Delete lifecycle actions. Extracted out of
 * `app/interviews/[sessionId]/summary/page.tsx` (a pure "here's a chunk of
 * markup" split, no behavior change) alongside the other section
 * components that page composes. */
export function SummaryHeaderSection({
  sessionId,
  candidateName,
  positionTitle,
  stageLabel,
  templateVersion,
  createdAt,
  isArchived,
  canReopen,
  canDelete,
  cannotDeleteNote,
  reopenAction,
  restoreAction,
  archiveAction,
  deleteAction,
  locale,
}: {
  sessionId: string;
  candidateName: string;
  positionTitle: string;
  stageLabel: string;
  templateVersion: number;
  createdAt: Date;
  isArchived: boolean;
  canReopen: boolean;
  canDelete: boolean;
  cannotDeleteNote: boolean;
  reopenAction: () => Promise<void>;
  restoreAction: () => Promise<void>;
  archiveAction: () => Promise<void>;
  deleteAction: () => Promise<void>;
  locale: Locale;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="text-[15px]">{candidateName}</CardTitle>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Link href={`/interviews/${sessionId}`} className="text-[12.5px] text-muted-foreground hover:underline">
              {t(locale, "interview.backToRating")}
            </Link>
            <Badge variant="secondary">{positionTitle}</Badge>
            <Badge variant="secondary">{stageLabel}</Badge>
            <Badge variant="outline" className="font-mono">
              v{templateVersion}
            </Badge>
            <Badge variant="outline" className="font-mono">
              {createdAt.toLocaleDateString(locale)}
            </Badge>
            {isArchived ? <Badge variant="outline">{t(locale, "interview.archivedBadge")}</Badge> : null}
          </div>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          {canReopen ? <ReopenSessionButton action={reopenAction} locale={locale} /> : null}
          {isArchived ? (
            <LifecycleActionButton
              action={restoreAction}
              label={t(locale, "interview.restoreSessionButton")}
              icon={<ArchiveRestore />}
            />
          ) : (
            <>
              <LifecycleActionButton
                action={archiveAction}
                label={t(locale, "interview.archiveSessionButton")}
                icon={<Archive />}
                confirmMessage={t(locale, "interview.archiveSessionConfirm")}
              />
              {canDelete ? (
                <LifecycleActionButton
                  action={deleteAction}
                  label={t(locale, "interview.deleteSessionButton")}
                  icon={<Trash2 />}
                  variant="destructive"
                  confirmMessage={`${t(locale, "interview.deleteSessionConfirmPrefix")}${candidateName}${t(locale, "interview.deleteSessionConfirmSuffix")}`}
                />
              ) : null}
            </>
          )}
        </div>
      </CardHeader>
      {!isArchived && cannotDeleteNote ? (
        <CardContent className="pt-0">
          <p className="text-[11.5px] text-muted-foreground">{t(locale, "interview.cannotDeleteSessionNote")}</p>
        </CardContent>
      ) : null}
    </Card>
  );
}
