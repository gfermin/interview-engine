import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppTopbar } from "@/components/layout/app-topbar";
import { PageContainer } from "@/components/layout/page-container";
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
import { SESSION_STATUS_LABELS } from "@/domain/interviews/session-lifecycle";
import { STAGE_LABELS, type InterviewStage } from "@/domain/interviews/stage-config";
import { startSessionAction } from "@/features/candidates/actions";
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
            </div>
            <ButtonLink variant="outline" size="sm" href={`/candidates/${candidate.id}/edit`}>
              {t(locale, "candidates.editButton")}
            </ButtonLink>
          </CardHeader>
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
                        <Badge variant={SESSION_STATUS_VARIANT[session.status]}>
                          {SESSION_STATUS_LABELS[session.status]}
                        </Badge>
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
