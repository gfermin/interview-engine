import Link from "next/link";
import { AppTopbar } from "@/components/layout/app-topbar";
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

export const dynamic = "force-dynamic";

// The task's own §22-23 framing: operational, not analytical. Every action
// here reaches an existing creation route in one click — no new routes.
const QUICK_ACTIONS = [
  { href: "/positions/new", label: "Create Position" },
  { href: "/templates/new", label: "Create Template" },
  { href: "/candidates/new", label: "Add Candidate" },
  { href: "/candidates", label: "Start Interview" },
];

/**
 * Replaces the Phase 1-13 static phase-status changelog (plan Phase 15/§41):
 * this is what the task's own §21 test asks of every widget here — "what
 * decision or action does this help the user make?" Four operational
 * counts, Quick Actions, Attention Required, Recent Interviews, and Active
 * Templates — no charts, no historical trends (deferred per §23/§39: a POC
 * dashboard is operational, not analytical).
 */
export default async function DashboardPage() {
  const [counts, attentionItems, recentSessions, activeTemplates] = await Promise.all([
    getDashboardCounts(),
    getAttentionItems(),
    getRecentSessions(8),
    getActiveTemplates(),
  ]);

  return (
    <>
      <AppTopbar title="Dashboard" />
      <main className="mx-auto flex w-full max-w-[980px] flex-1 flex-col gap-5 px-6 py-7">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricTile label="Interviews Today" value={counts.interviewsToday} />
          <MetricTile label="In Progress" value={counts.inProgress} />
          <MetricTile label="Awaiting Decision" value={counts.awaitingDecision} />
          <MetricTile label="Completed" value={counts.completed} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-[13.5px]">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map((action) => (
              <ButtonLink key={action.href} href={action.href} size="sm" variant="outline">
                {action.label}
              </ButtonLink>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[13.5px]">Attention Required</CardTitle>
          </CardHeader>
          <CardContent>
            {attentionItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing needs attention right now.</p>
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
            <CardTitle className="text-[13.5px]">Recent Interviews</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentSessions.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">
                No interviews yet — start one from a{" "}
                <Link href="/candidates" className="underline">
                  candidate&apos;s page
                </Link>
                .
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
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
                          Open
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
            <CardTitle className="text-[13.5px]">Active Templates</CardTitle>
          </CardHeader>
          <CardContent>
            {activeTemplates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No published templates yet — create one from{" "}
                <Link href="/templates/new" className="underline">
                  Templates
                </Link>
                .
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
      </main>
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
