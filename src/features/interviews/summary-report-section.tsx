import { Trash2 } from "lucide-react";
import { RowActionButton } from "@/components/row-action-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { t, type Locale } from "@/lib/i18n";
import { GenerateReportButton } from "../reports/generate-report-button";

interface ReportRow {
  id: string;
  displayName: string | null;
  createdAt: Date;
  fileSize: number;
}

/** The generated-reports list + "Generate Report" action (plan Phase 34/
 * AUDIT-021) — extracted out of the Summary page's monolithic body. A pure
 * markup/prop split, no behavior change. */
export function SummaryReportSection({
  sessionId,
  candidateName,
  positionTitle,
  stageLabel,
  reports,
  canGenerate,
  deleteReportAction,
  generateReportAction,
  locale,
}: {
  sessionId: string;
  candidateName: string;
  positionTitle: string;
  stageLabel: string;
  reports: ReportRow[];
  canGenerate: boolean;
  deleteReportAction: (reportId: string, sessionId: string) => Promise<void>;
  generateReportAction: (
    prevState: { error?: string } | undefined
  ) => Promise<{ error?: string } | undefined>;
  locale: Locale;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[13.5px]">{t(locale, "interview.reportHeading")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {reports.length > 0 ? (
          <ul className="flex flex-col gap-1.5">
            {reports.map((report) => (
              <li
                key={report.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-[12.5px]"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">
                    {report.displayName ?? `${candidateName} — ${positionTitle} — ${stageLabel}`}
                  </span>
                  <span className="text-muted-foreground">
                    {t(locale, "interview.reportGenerated")}{" "}
                    <span className="font-mono">{report.createdAt.toLocaleString(locale)}</span> (
                    <span className="font-mono">{Math.round(report.fileSize / 1024)} KB</span>)
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <a href={`/api/reports/${report.id}`} className="font-medium text-primary hover:underline">
                    {t(locale, "interview.downloadLabel")}
                  </a>
                  <RowActionButton
                    action={deleteReportAction.bind(null, report.id, sessionId)}
                    icon={<Trash2 />}
                    label={t(locale, "interview.deleteReportButton")}
                    confirmMessage={t(locale, "interview.deleteReportConfirm")}
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {canGenerate ? (
          <GenerateReportButton action={generateReportAction} locale={locale} />
        ) : (
          <p className="text-sm text-muted-foreground">{t(locale, "interview.reportPendingNote")}</p>
        )}
      </CardContent>
    </Card>
  );
}
