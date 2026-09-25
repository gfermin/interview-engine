import { cookies } from "next/headers";
import Link from "next/link";
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
import { STAGE_LABELS, statusLabelFor } from "@/domain/interviews/stage-config";
import {
  getActiveTemplates,
  getAttentionItems,
  getDashboardCounts,
  getRecentSessions,
} from "@/features/dashboard/queries";
import { APP_LOCALE_COOKIE, resolveLocale } from "@/features/settings/locale";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

// The task's own §22-23 framing: operational, not analytical. Every action
// here reaches an existing creation route in one click — no new routes.
const QUICK_ACTIONS = [
  { href: "/positions/new", key: "dashboard.actionCreatePosition" },
  { href: "/templates/new", key: "dashboard.actionCreateTemplate" },
  { href: "/candidates/new", key: "dashboard.actionAddCandidate" },
  { href: "/candidates", key: "dashboard.actionStartInterview" },
] as const;

/**
 * Replaces the Phase 1-13 static phase-status changelog (plan Phase 15/§41):
 * this is what the task's own §21 test asks of every widget here — "what
 * decision or action does this help the user make?" Four operational
 * counts, Quick Actions, Attention Required, Recent Interviews, and Active
 * Templates — no charts, no historical trends (deferred per §23/§39: a POC
 * dashboard is operational, not analytical).
 */
export default async function DashboardPage() {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(APP_LOCALE_COOKIE)?.value);

  const [counts, attentionItems, recentSessions, activeTemplates] = await Promise.all([
    getDashboardCounts(),
    getAttentionItems(),
    getRecentSessions(8),
    getActiveTemplates(),
  ]);

  return (
    <>
      <AppTopbar title={t(locale, "dashboard.title")} locale={locale} />
      <PageContainer width="wide">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricTile label={t(locale, "dashboard.metricInterviewsToday")} value={counts.interviewsToday} />
          <MetricTile label={t(locale, "dashboard.metricInProgress")} value={counts.inProgress} />
          <MetricTile label={t(locale, "dashboard.metricAwaitingDecision")} value={counts.awaitingDecision} />
          <MetricTile label={t(locale, "dashboard.metricCompleted")} value={counts.completed} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-[13.5px]">{t(locale, "dashboard.quickActions")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map((action) => (
              <ButtonLink key={action.href} href={action.href} size="sm" variant="outline">
                {t(locale, action.key)}
              </ButtonLink>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[13.5px]">{t(locale, "dashboard.attentionRequired")}</CardTitle>
          </CardHeader>
          <CardContent>
            {attentionItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t(locale, "dashboard.attentionEmpty")}</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {attentionItems.map((item) => (
                  <li key={`${item.kind}-${item.href}`}>
                    <Link
                      href={item.href}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-[12.5px] hover:bg-muted"
                    >
                      <span>{item.label}</span>
                      <span className="text-muted-foreground">{item.detail}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[13.5px]">{t(locale, "dashboard.recentInterviews")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentSessions.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">
                {t(locale, "dashboard.recentInterviewsEmptyPrefix")}
                <Link href="/candidates" className="underline">
                  {t(locale, "dashboard.candidatesPageLinkText")}
                </Link>
                {t(locale, "dashboard.recentInterviewsEmptySuffix")}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t(locale, "dashboard.tableCandidate")}</TableHead>
                    <TableHead>{t(locale, "dashboard.tablePosition")}</TableHead>
                    <TableHead>{t(locale, "dashboard.tableStage")}</TableHead>
                    <TableHead>{t(locale, "dashboard.tableScore")}</TableHead>
                    <TableHead>{t(locale, "dashboard.tableStatus")}</TableHead>
                    <TableHead>{t(locale, "dashboard.tableDate")}</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>{session.candidateName}</TableCell>
                      <TableCell>{session.positionTitle}</TableCell>
                      <TableCell>{STAGE_LABELS[session.stage]}</TableCell>
                      <TableCell className="font-mono">
                        {session.overall !== null ? `${Math.round(session.overall)}%` : "—"}
                      </TableCell>
                      <TableCell>{statusLabelFor(session.stage, session.calculatedStatus)}</TableCell>
                      <TableCell className="font-mono">{session.createdAt.toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Link
                          href={
                            session.status === "in_progress"
                              ? `/interviews/${session.id}`
                              : `/interviews/${session.id}/summary`
                          }
                          className="font-medium text-primary hover:underline"
                        >
                          {t(locale, "dashboard.open")}
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[13.5px]">{t(locale, "dashboard.activeTemplates")}</CardTitle>
          </CardHeader>
          <CardContent>
            {activeTemplates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t(locale, "dashboard.activeTemplatesEmptyPrefix")}
                <Link href="/templates/new" className="underline">
                  {t(locale, "dashboard.templatesLinkText")}
                </Link>
                {t(locale, "dashboard.activeTemplatesEmptySuffix")}
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {activeTemplates.map((template) => (
                  <li key={template.id}>
                    <Link
                      href={`/templates/${template.id}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-[12.5px] hover:bg-muted"
                    >
                      <span>
                        {template.positionTitle} — {STAGE_LABELS[template.stage]}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Badge variant="outline" className="font-mono">
                          v{template.version}
                        </Badge>
                        <Badge variant={template.status === "locked" ? "secondary" : "default"} className="capitalize">
                          {template.status}
                        </Badge>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </PageContainer>
    </>
  );
}

function MetricTile({ label, value }: { label: string; value: number }) {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-1">
        <span className="text-[10.5px] font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
        <span className="font-mono text-2xl font-bold">{value}</span>
      </CardContent>
    </Card>
  );
}
