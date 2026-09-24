import Link from "next/link";
import { AppTopbar } from "@/components/layout/app-topbar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const NEXT_UP = [
  {
    phase: "Phase 12",
    title: "BambooHR Integration POC",
    detail:
      "Validate real BambooHR API capabilities and implement a minimal, mocked-by-default integration, now that the core loop (Phases 1-11) is proven.",
  },
  {
    phase: "Phase 13",
    title: "Hardening / Testing / UX Polish",
    detail:
      "Fill test coverage gaps and polish rough UX edges found during real usage of Phases 1-11 — no new features.",
  },
  {
    phase: "Phase 14",
    title: "Production Readiness",
    detail:
      "Authentication/RBAC, Postgres migration, encrypted storage, deployment target, observability — pending a decision to move toward shared/multi-user use.",
  },
];

export default function DashboardPage() {
  return (
    <>
      <AppTopbar title="Dashboard" />
      <main className="mx-auto flex w-full max-w-[980px] flex-1 flex-col gap-5 px-6 py-7">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-[15px]">
                Phase 11 — Persistence / History / Versioning Hardening
              </CardTitle>
              <CardDescription className="mt-1">
                This phase&apos;s completion is the POC completion (plan
                §11): an Interview History screen lists and filters every
                session by position, candidate, stage, or status, and an
                explicit &ldquo;Reopen&rdquo; action unfreezes a{" "}
                <code>completed</code> or <code>decided</code> session back
                to <code>in_progress</code>, stamping{" "}
                <code>reopenedAt</code>/<code>reopenCount</code> rather than
                silently editing history. Reopening doesn&apos;t erase the
                prior decision or report — it stays visible until the
                interviewer re-decides, and generating again produces a
                second, distinct <code>InterviewReport</code> rather than
                overwriting the first. Hardening this phase also surfaced
                and fixed a real bug from Phase 9: the Summary screen&apos;s
                own Mandatory Requirement and English controls were
                incorrectly locked the moment a session left{" "}
                <code>in_progress</code>, before a decision even existed.
              </CardDescription>
            </div>
            <Button size="sm" render={<Link href="/interviews">Open History</Link>} />
          </CardHeader>
        </Card>

        <div className="flex flex-col gap-3">
          <h3 className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            Next up
          </h3>
          {NEXT_UP.map((item) => (
            <Card key={item.phase}>
              <CardHeader>
                <CardDescription className="font-mono text-[10.5px] uppercase tracking-wide text-primary">
                  {item.phase}
                </CardDescription>
                <CardTitle className="text-[13.5px]">{item.title}</CardTitle>
                <CardDescription>{item.detail}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </main>
    </>
  );
}
