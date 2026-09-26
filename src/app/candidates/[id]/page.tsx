import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArchiveRestore, Archive as ArchiveIcon, Trash2 } from "lucide-react";
import { AppTopbar } from "@/components/layout/app-topbar";
import { PageContainer } from "@/components/layout/page-container";
import { LifecycleActionButton } from "@/components/lifecycle-action-button";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { canDeleteCandidate } from "@/domain/candidates/lifecycle";
import { SESSION_STATUS_LABELS } from "@/domain/interviews/session-lifecycle";
import { STAGE_LABELS, type InterviewStage } from "@/domain/interviews/stage-config";
import {
  archiveCandidateAction,
  deleteCandidateAction,
  restoreCandidateAction,
  startSessionAction,
} from "@/features/candidates/actions";
import { getCandidate, listSessionsForCandidate } from "@/features/candidates/queries";
import { StartSessionForm } from "@/features/candidates/start-session-form";
import { APP_LOCALE_COOKIE, resolveLocale } from "@/features/settings/locale";
import { listPublishedTemplates } from "@/features/templates/queries";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const SESSION_STATUS_VARIANT = {
  in_progress: "outline",
  completed: "secondary",
  decided: "default",
} as const;

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(APP_LOCALE_COOKIE)?.value);

  const { id } = await params;
  const candidate = await getCandidate(id);
  if (!candidate) notFound();

  const [sessions, publishedTemplates] = await Promise.all([
    listSessionsForCandidate(id),
    listPublishedTemplates(),
  ]);

  const boundStartSession = startSessionAction.bind(null, id);
  const isArchived = Boolean(candidate.archivedAt);
  const deleteCheck = canDeleteCandidate(sessions.length);

  return (
    <>
      <AppTopbar title={candidate.name} locale={locale} />
      <PageContainer width="wide">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="text-[15px]">{candidate.name}</CardTitle>
              <p className="mt-1 text-[12.5px] text-muted-foreground">
                {candidate.email ?? t(locale, "candidates.noEmailOnFile")}
              </p>
              {candidate.notes ? (
                <p className="mt-2 max-w-md text-[12.5px] whitespace-pre-wrap text-muted-foreground">
                  {candidate.notes}
                </p>
              ) : null}
              {isArchived ? (
                <Badge variant="outline" className="mt-2">
                  {t(locale, "candidates.archivedBadge")}
                </Badge>
              ) : null}
            </div>
            <div className="flex flex-wrap items-start gap-2">
              <ButtonLink variant="outline" size="sm" href={`/candidates/${candidate.id}/edit`}>
                {t(locale, "candidates.editButton")}
              </ButtonLink>
              {isArchived ? (
                <LifecycleActionButton
                  action={restoreCandidateAction.bind(null, candidate.id)}
                  label={t(locale, "candidates.restoreButton")}
                  icon={<ArchiveRestore />}
                />
              ) : (
                <>
                  <LifecycleActionButton
                    action={archiveCandidateAction.bind(null, candidate.id)}
                    label={t(locale, "candidates.archiveButton")}
                    icon={<ArchiveIcon />}
                    confirmMessage={t(locale, "candidates.archiveConfirm")}
                  />
                  {deleteCheck.allowed ? (
                    <LifecycleActionButton
                      action={deleteCandidateAction.bind(null, candidate.id)}
                      label={t(locale, "candidates.deleteButton")}
                      icon={<Trash2 />}
                      variant="destructive"
                      confirmMessage={`${t(locale, "candidates.deleteConfirmPrefix")}${candidate.name}${t(locale, "candidates.deleteConfirmSuffix")}`}
                    />
                  ) : null}
                </>
              )}
            </div>
          </CardHeader>
          {!isArchived && !deleteCheck.allowed ? (
            <CardContent className="pt-0">
              <p className="text-[11.5px] text-muted-foreground">
                {t(locale, "candidates.cannotDeletePrefix")}
                {sessions.length}
                {t(
                  locale,
                  sessions.length === 1
                    ? "candidates.cannotDeleteSessionSingular"
                    : "candidates.cannotDeleteSessionPlural"
                )}
              </p>
            </CardContent>
          ) : null}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[13.5px]">{t(locale, "candidates.startSessionHeading")}</CardTitle>
          </CardHeader>
          <CardContent>
            {publishedTemplates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t(locale, "candidates.noPublishedTemplatesPrefix")}
                <Link href="/templates" className="underline">
                  {t(locale, "candidates.publishOneLinkText")}
                </Link>
                {t(locale, "candidates.noPublishedTemplatesSuffix")}
              </p>
            ) : (
              <StartSessionForm action={boundStartSession} templates={publishedTemplates} locale={locale} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[13.5px]">{t(locale, "candidates.sessionsHeading")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {sessions.length === 0 ? (
              <p className="px-6 pb-4 text-sm text-muted-foreground">
                {t(locale, "candidates.noSessionsYet")}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t(locale, "candidates.tablePosition")}</TableHead>
                    <TableHead>{t(locale, "candidates.tableStage")}</TableHead>
                    <TableHead>{t(locale, "candidates.tableTemplate")}</TableHead>
                    <TableHead>{t(locale, "candidates.tableStatus")}</TableHead>
                    <TableHead className="text-right">{t(locale, "candidates.tableAction")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>
                        <Link
                          href={`/positions/${session.positionId}`}
                          className="font-medium hover:underline"
                        >
                          {session.positionTitle}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {STAGE_LABELS[session.stage as InterviewStage]}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <Link href={`/templates/${session.templateId}`} className="hover:underline">
                          {session.templateName} (v{session.templateVersion})
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant={SESSION_STATUS_VARIANT[session.status]}>
                            {SESSION_STATUS_LABELS[session.status]}
                          </Badge>
                          {session.archivedAt ? (
                            <Badge variant="outline">{t(locale, "candidates.archivedBadge")}</Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <ButtonLink size="sm" variant="outline" href={`/interviews/${session.id}`}>
                            {t(locale, "candidates.rateButton")}
                          </ButtonLink>
                          <ButtonLink
                            size="sm"
                            variant="outline"
                            href={`/interviews/${session.id}/summary`}
                          >
                            {t(locale, "candidates.summaryButton")}
                          </ButtonLink>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </PageContainer>
    </>
  );
}
