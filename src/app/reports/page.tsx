import { cookies } from "next/headers";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { AppTopbar } from "@/components/layout/app-topbar";
import { PageContainer } from "@/components/layout/page-container";
import { RowActionButton } from "@/components/row-action-button";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { INTERVIEW_STAGES, STAGE_LABELS } from "@/domain/interviews/stage-config";
import { STATUS_TONE, ToneBadge } from "@/features/interviews/status-badge";
import { deleteReportAction } from "@/features/reports/actions";
import { listAllReports, type ReportListFilters } from "@/features/reports/queries";
import { APP_LOCALE_COOKIE, resolveLocale } from "@/features/settings/locale";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * The Reports Hub (plan Phase 18/§42) — the page `/reports` never had. Every
 * finalized report, newest first, searchable by candidate/position, backed
 * by the exact same `InterviewDecision`/scoring data Summary already shows
 * (never recalculated independently — plan §11).
 */
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(APP_LOCALE_COOKIE)?.value);

  const params = await searchParams;
  const search = firstValue(params.search);
  const stage = firstValue(params.stage) as ReportListFilters["stage"];
  const hasFilters = Boolean(search || stage);

  const reports = await listAllReports({ search, stage });

  return (
    <>
      <AppTopbar title={t(locale, "reports.title")} locale={locale} />
      <PageContainer width="wide">
        <p className="text-[12.5px] text-muted-foreground">{t(locale, "reports.description")}</p>

        <Card>
          <CardContent className="pt-5">
            <form className="grid grid-cols-1 gap-3 sm:grid-cols-4" method="get">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-[11px] text-muted-foreground" htmlFor="search">
                  {t(locale, "reports.searchLabel")}
                </label>
                <Input
                  id="search"
                  name="search"
                  defaultValue={search ?? ""}
                  placeholder={t(locale, "reports.searchPlaceholder")}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-muted-foreground" htmlFor="stage">
                  {t(locale, "reports.stageLabel")}
                </label>
                <Select id="stage" name="stage" defaultValue={stage ?? ""}>
                  <option value="">{t(locale, "reports.allStages")}</option>
                  {INTERVIEW_STAGES.map((s) => (
                    <option key={s} value={s}>
                      {STAGE_LABELS[s]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex items-end gap-2">
                <Button type="submit" size="sm">
                  {t(locale, "reports.searchButton")}
                </Button>
                {hasFilters ? (
                  <ButtonLink size="sm" variant="outline" href="/reports">
                    {t(locale, "reports.clearButton")}
                  </ButtonLink>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>

        {reports.length === 0 ? (
          hasFilters ? (
            <Card>
              <CardContent className="flex flex-col gap-3 pt-6">
                <p className="text-sm text-muted-foreground">{t(locale, "reports.emptyFilteredMessage")}</p>
                <ButtonLink size="sm" variant="outline" href="/reports" className="self-start">
                  {t(locale, "reports.clearFilters")}
                </ButtonLink>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col gap-3 pt-6">
                <p className="text-sm font-medium">{t(locale, "reports.emptyTitle")}</p>
                <p className="text-[12.5px] text-muted-foreground">{t(locale, "reports.emptyDescription")}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <ButtonLink size="sm" variant="outline" href="/candidates">
                    {t(locale, "reports.viewCandidates")}
                  </ButtonLink>
                  <ButtonLink size="sm" variant="outline" href="/interviews">
                    {t(locale, "reports.interviewHistory")}
                  </ButtonLink>
                  <ButtonLink size="sm" variant="outline" href="/">
                    {t(locale, "reports.goToDashboard")}
                  </ButtonLink>
                </div>
              </CardContent>
            </Card>
          )
        ) : (
          <div className="flex flex-col gap-3">
            {reports.map((report) => (
              <Card key={report.id}>
                <CardContent className="flex flex-wrap items-start justify-between gap-4 pt-5">
                  <div className="flex flex-col gap-1.5">
                    <Link
                      href={`/candidates/${report.candidateId}`}
                      className="text-[15px] font-semibold hover:underline"
                    >
                      {report.candidateName}
                    </Link>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary">{report.positionTitle}</Badge>
                      <Badge variant="secondary">{report.stageLabel}</Badge>
                      <Badge variant="outline" className="font-mono">
                        v{report.templateVersion}
                      </Badge>
                    </div>
                    <p className="text-[11.5px] text-muted-foreground">
                      {t(locale, "reports.generated")}{" "}
                      <span className="font-mono">{report.createdAt.toLocaleDateString(locale)}</span> ·{" "}
                      <span className="font-mono">{Math.round(report.fileSize / 1024)} KB</span>
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <span className="font-mono text-[12.5px]">
                        {report.overall !== null ? `${Math.round(report.overall)}%` : "—"}
                      </span>
                      {report.calculatedStatus && report.statusLabel ? (
                        <ToneBadge
                          tone={STATUS_TONE[report.calculatedStatus]}
                          label={report.statusLabel}
                        />
                      ) : null}
                      {report.finalDecision && report.finalDecisionLabel ? (
                        <ToneBadge
                          tone={report.finalDecision === "PASS" ? "pass" : "fail"}
                          label={report.finalDecisionLabel}
                        />
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ButtonLink
                        size="sm"
                        variant="outline"
                        href={`/interviews/${report.sessionId}/summary`}
                      >
                        {t(locale, "reports.viewResults")}
                      </ButtonLink>
                      <ButtonLink size="sm" href={`/api/reports/${report.id}`}>
                        {t(locale, "reports.pdfButton")}
                      </ButtonLink>
                      <RowActionButton
                        action={deleteReportAction.bind(null, report.id, report.sessionId)}
                        icon={<Trash2 />}
                        label={t(locale, "reports.deleteButton")}
                        confirmMessage={t(locale, "reports.deleteConfirm")}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </PageContainer>
    </>
  );
}
