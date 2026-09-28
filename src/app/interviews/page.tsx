import { cookies } from "next/headers";
import Link from "next/link";
import { AppTopbar } from "@/components/layout/app-topbar";
import { PageContainer } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { SESSION_STATUS_LABELS } from "@/domain/interviews/session-lifecycle";
import { INTERVIEW_STAGES, STAGE_LABELS, type InterviewStage } from "@/domain/interviews/stage-config";
import { listCandidates } from "@/features/candidates/queries";
import { listSessions, type SessionListFilters } from "@/features/interviews/queries";
import { listPositions } from "@/features/positions/queries";
import { APP_LOCALE_COOKIE, resolveLocale } from "@/features/settings/locale";
import { t } from "@/lib/i18n";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

const SESSION_STATUSES = ["in_progress", "completed", "decided"] as const;
const SESSION_STATUS_VARIANT = {
  in_progress: "outline",
  completed: "secondary",
  decided: "default",
} as const;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function InterviewsHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const cookieStore = await cookies();
  const locale = resolveLocale(cookieStore.get(APP_LOCALE_COOKIE)?.value);

  const params = await searchParams;
  const positionId = firstValue(params.positionId);
  const candidateId = firstValue(params.candidateId);
  const stage = firstValue(params.stage) as SessionListFilters["stage"];
  const status = firstValue(params.status) as SessionListFilters["status"];
  const archived = (firstValue(params.archived) as SessionListFilters["archived"]) ?? "active";

  const hasFilters = Boolean(positionId || candidateId || stage || status || archived !== "active");
  const [sessions, positions, candidates] = await Promise.all([
    listSessions({ positionId, candidateId, stage, status, archived }),
    // Plan Phase 23/§44.9: this filter form's own dropdowns should still let
    // you find a session under an archived Position/Candidate — the session
    // list itself is what the Archived select above already scopes.
    listPositions({ archived: "all" }),
    listCandidates({ archived: "all" }),
  ]);

  return (
    <>
      <AppTopbar title={t(locale, "interview.historyPageTitle")} locale={locale} />
      <PageContainer width="wide">
        <p className="text-[12.5px] text-muted-foreground">{t(locale, "interview.historyPageDescription")}</p>

        <Card>
          <CardContent className="pt-5">
            <form className="grid grid-cols-2 gap-3 sm:grid-cols-4" method="get">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-muted-foreground" htmlFor="positionId">
                  {t(locale, "interview.historyFilterPositionLabel")}
                </label>
                <Select id="positionId" name="positionId" defaultValue={positionId ?? ""}>
                  <option value="">{t(locale, "interview.historyAllPositionsOption")}</option>
                  {positions.map((position) => (
                    <option key={position.id} value={position.id}>
                      {position.title}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-muted-foreground" htmlFor="candidateId">
                  {t(locale, "interview.historyFilterCandidateLabel")}
                </label>
                <Select id="candidateId" name="candidateId" defaultValue={candidateId ?? ""}>
                  <option value="">{t(locale, "interview.historyAllCandidatesOption")}</option>
                  {candidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-muted-foreground" htmlFor="stage">
                  {t(locale, "interview.historyFilterStageLabel")}
                </label>
                <Select id="stage" name="stage" defaultValue={stage ?? ""}>
                  <option value="">{t(locale, "interview.historyAllStagesOption")}</option>
                  {INTERVIEW_STAGES.map((s) => (
                    <option key={s} value={s}>
                      {STAGE_LABELS[s]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-muted-foreground" htmlFor="status">
                  {t(locale, "interview.historyFilterStatusLabel")}
                </label>
                <Select id="status" name="status" defaultValue={status ?? ""}>
                  <option value="">{t(locale, "interview.historyAllStatusesOption")}</option>
                  {SESSION_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {SESSION_STATUS_LABELS[s]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-muted-foreground" htmlFor="archived">
                  {t(locale, "interview.statusFilterLabel")}
                </label>
                <Select id="archived" name="archived" defaultValue={archived}>
                  <option value="active">{t(locale, "interview.filterActiveOption")}</option>
                  <option value="archived">{t(locale, "interview.filterArchivedOption")}</option>
                  <option value="all">{t(locale, "interview.filterAllOption")}</option>
                </Select>
              </div>
              <div className="col-span-2 flex items-end gap-2 sm:col-span-4">
                <Button type="submit" size="sm">
                  {t(locale, "interview.historyFilterButton")}
                </Button>
                {hasFilters ? (
                  <ButtonLink size="sm" variant="outline" href="/interviews">
                    {t(locale, "interview.historyClearButton")}
                  </ButtonLink>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {sessions.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">
                {hasFilters ? (
                  t(locale, "interview.historyEmptyFilteredMessage")
                ) : (
                  <>
                    {t(locale, "interview.historyEmptyPrefix")}
                    <Link href="/candidates" className="underline">
                      {t(locale, "interview.historyEmptyLinkText")}
                    </Link>
                    {t(locale, "interview.historyEmptySuffix")}
                  </>
                )}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t(locale, "interview.historyTableCandidate")}</TableHead>
                    <TableHead>{t(locale, "interview.historyTablePosition")}</TableHead>
                    <TableHead>{t(locale, "interview.historyTableStage")}</TableHead>
                    <TableHead>{t(locale, "interview.historyTableTemplate")}</TableHead>
                    <TableHead>{t(locale, "interview.historyTableStatus")}</TableHead>
                    <TableHead className="text-right">{t(locale, "interview.historyTableAction")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>
                        <Link
                          href={`/candidates/${session.candidateId}`}
                          className="font-medium hover:underline"
                        >
                          {session.candidateName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <Link href={`/positions/${session.positionId}`} className="hover:underline">
                          {session.positionTitle}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {STAGE_LABELS[session.stage as InterviewStage]}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <Link href={`/templates/${session.templateId}`} className="hover:underline">
                          v{session.templateVersion}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant={SESSION_STATUS_VARIANT[session.status]}>
                            {SESSION_STATUS_LABELS[session.status]}
                            {session.reopenCount > 0
                              ? ` · ${t(locale, "interview.historyReopenedLabel")} ${session.reopenCount}×`
                              : ""}
                          </Badge>
                          {session.archivedAt ? (
                            <Badge variant="outline">{t(locale, "interview.archivedBadge")}</Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <ButtonLink size="sm" variant="outline" href={`/interviews/${session.id}`}>
                            {t(locale, "interview.historyRateButton")}
                          </ButtonLink>
                          <ButtonLink
                            size="sm"
                            variant="outline"
                            href={`/interviews/${session.id}/summary`}
                          >
                            {t(locale, "interview.historySummaryButton")}
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
