import Link from "next/link";
import { AppTopbar } from "@/components/layout/app-topbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { SESSION_STATUS_LABELS } from "@/domain/interviews/session-lifecycle";
import { INTERVIEW_STAGES, STAGE_LABELS, type InterviewStage } from "@/domain/interviews/stage-config";
import { listCandidates } from "@/features/candidates/queries";
import { listSessions, type SessionListFilters } from "@/features/interviews/queries";
import { listPositions } from "@/features/positions/queries";
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
  const params = await searchParams;
  const positionId = firstValue(params.positionId);
  const candidateId = firstValue(params.candidateId);
  const stage = firstValue(params.stage) as SessionListFilters["stage"];
  const status = firstValue(params.status) as SessionListFilters["status"];

  const hasFilters = Boolean(positionId || candidateId || stage || status);
  const [sessions, positions, candidates] = await Promise.all([
    listSessions({ positionId, candidateId, stage, status }),
    listPositions(),
    listCandidates(),
  ]);

  return (
    <>
      <AppTopbar title="Interview History" />
      <main className="mx-auto flex w-full max-w-[980px] flex-1 flex-col gap-5 px-6 py-7">
        <p className="text-[12.5px] text-muted-foreground">
          Every Interview Session across every candidate (plan §11/Phase 11). Reopen a
          finished session from its Rate or Summary screen to make further changes.
        </p>

        <Card>
          <CardContent className="pt-5">
            <form className="grid grid-cols-2 gap-3 sm:grid-cols-4" method="get">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-muted-foreground" htmlFor="positionId">
                  Position
                </label>
                <Select id="positionId" name="positionId" defaultValue={positionId ?? ""}>
                  <option value="">All positions</option>
                  {positions.map((position) => (
                    <option key={position.id} value={position.id}>
                      {position.title}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-muted-foreground" htmlFor="candidateId">
                  Candidate
                </label>
                <Select id="candidateId" name="candidateId" defaultValue={candidateId ?? ""}>
                  <option value="">All candidates</option>
                  {candidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-muted-foreground" htmlFor="stage">
                  Stage
                </label>
                <Select id="stage" name="stage" defaultValue={stage ?? ""}>
                  <option value="">All stages</option>
                  {INTERVIEW_STAGES.map((s) => (
                    <option key={s} value={s}>
                      {STAGE_LABELS[s]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-muted-foreground" htmlFor="status">
                  Status
                </label>
                <Select id="status" name="status" defaultValue={status ?? ""}>
                  <option value="">All statuses</option>
                  {SESSION_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {SESSION_STATUS_LABELS[s]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="col-span-2 flex items-end gap-2 sm:col-span-4">
                <Button type="submit" size="sm">
                  Filter
                </Button>
                {hasFilters ? (
                  <Button size="sm" variant="outline" render={<Link href="/interviews">Clear</Link>} />
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
                  "No interview sessions match these filters."
                ) : (
                  <>
                    No interviews yet — start one from a{" "}
                    <Link href="/candidates" className="underline">
                      candidate&apos;s page
                    </Link>
                    .
                  </>
                )}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
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
                        <Badge variant={SESSION_STATUS_VARIANT[session.status]}>
                          {SESSION_STATUS_LABELS[session.status]}
                          {session.reopenCount > 0 ? ` · reopened ${session.reopenCount}×` : ""}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            render={<Link href={`/interviews/${session.id}`}>Rate</Link>}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            render={<Link href={`/interviews/${session.id}/summary`}>Summary</Link>}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
