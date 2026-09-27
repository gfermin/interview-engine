import Link from "next/link";
import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { LifecycleActionButton } from "@/components/lifecycle-action-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { INTERVIEW_LANGUAGE_LABELS, type InterviewLanguage } from "@/domain/interviews/interview-language";
import type { FormActionState } from "@/lib/form-action-state";
import { t, type Locale } from "@/lib/i18n";
import { NewVersionButton, PublishButton } from "./template-actions";

const STATUS_VARIANT = {
  draft: "outline",
  approved: "secondary",
  locked: "default",
} as const;

/** The Template detail page's header Card (plan Phase 34/AUDIT-021) — name,
 * position link, stage/language/version/status badges, editability/delete
 * notes, and the Publish/New-Version/Archive/Restore/Delete lifecycle
 * actions. Extracted out of `app/templates/[id]/page.tsx` (a pure "here's a
 * chunk of markup" split, no behavior change) alongside its sibling section
 * components. */
export function TemplateHeaderSection({
  name,
  interviewLanguage,
  version,
  status,
  stageLabel,
  positionId,
  positionTitle,
  isArchived,
  editable,
  editableNote,
  canDelete,
  cannotDeleteNote,
  publishAction,
  createNewVersionAction,
  restoreAction,
  archiveAction,
  deleteAction,
  locale,
}: {
  name: string;
  interviewLanguage: InterviewLanguage;
  version: number;
  status: "draft" | "approved" | "locked";
  stageLabel: string;
  positionId: string | null;
  positionTitle: string | null;
  isArchived: boolean;
  editable: boolean;
  editableNote: string | null;
  canDelete: boolean;
  cannotDeleteNote: boolean;
  publishAction: (prevState: FormActionState | undefined) => Promise<FormActionState | undefined>;
  createNewVersionAction: () => Promise<void>;
  restoreAction: () => Promise<void>;
  archiveAction: () => Promise<void>;
  deleteAction: () => Promise<void>;
  locale: Locale;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-[15px]">{name}</CardTitle>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {positionId && positionTitle ? (
              <Link href={`/positions/${positionId}`} className="text-[12.5px] text-muted-foreground hover:underline">
                {positionTitle}
              </Link>
            ) : null}
            <Badge variant="secondary">{stageLabel}</Badge>
            <Badge variant="outline">{INTERVIEW_LANGUAGE_LABELS[interviewLanguage]}</Badge>
            <Badge variant="outline" className="font-mono">
              v{version}
            </Badge>
            <Badge variant={STATUS_VARIANT[status]} className="capitalize">
              {status}
            </Badge>
            {isArchived ? <Badge variant="outline">{t(locale, "templates.archivedBadge")}</Badge> : null}
          </div>
          {editableNote ? <p className="mt-2 max-w-md text-[11px] text-muted-foreground">{editableNote}</p> : null}
          {!isArchived && cannotDeleteNote ? (
            <p className="mt-2 max-w-md text-[11px] text-muted-foreground">
              {t(locale, "templates.cannotDeleteTemplateNote")}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-start gap-2">
          {editable ? (
            <PublishButton action={publishAction} locale={locale} />
          ) : (
            <NewVersionButton action={createNewVersionAction} locale={locale} />
          )}
          {isArchived ? (
            <LifecycleActionButton
              action={restoreAction}
              label={t(locale, "templates.restoreTemplateButton")}
              icon={<ArchiveRestore />}
            />
          ) : (
            <>
              <LifecycleActionButton
                action={archiveAction}
                label={t(locale, "templates.archiveTemplateButton")}
                icon={<Archive />}
                confirmMessage={t(locale, "templates.archiveTemplateConfirm")}
              />
              {canDelete ? (
                <LifecycleActionButton
                  action={deleteAction}
                  label={t(locale, "templates.deleteTemplateButton")}
                  icon={<Trash2 />}
                  variant="destructive"
                  confirmMessage={`${t(locale, "templates.deleteTemplateConfirmPrefix")}${name}${t(locale, "templates.deleteTemplateConfirmSuffix")}`}
                />
              ) : null}
            </>
          )}
        </div>
      </CardHeader>
    </Card>
  );
}
