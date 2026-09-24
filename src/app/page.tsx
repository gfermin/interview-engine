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
    phase: "Phase 13 (continued)",
    title: "Hardening backlog (plan §40)",
    detail:
      "A confirmed DecisionForm state bug after Reopen, jargon-y/leaky error messages, missing error.tsx/not-found.tsx, a few data-integrity gaps, and most of the test-coverage gaps (createNewTemplateVersion most notably) — audited and recorded, not yet fixed.",
  },
  {
    phase: "Phase 12",
    title: "BambooHR Integration POC",
    detail:
      "Validate real BambooHR API capabilities and implement a minimal, mocked-by-default integration, now that the core loop (Phases 1-11) is proven.",
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
                Phase 13 — Hardening / Testing / UX Polish (in progress)
              </CardTitle>
              <CardDescription className="mt-1">
                The core POC loop (Phases 1-11) is done. Since this
                phase&apos;s plan entry is open-ended rather than a fixed
                task list, it began with a full-codebase audit — test
                coverage, error-messaging quality, missing Next.js
                conventions, UX rough edges, dead code, Zod schema gaps —
                recorded in the implementation plan&apos;s{" "}
                <code>§40</code>. Pure display/copy fixes shipped
                immediately: friendly stage-aware labels in place of raw
                enums on the Summary screen, a fixed duplicate-text
                template picker, one shared session-status label map, and
                a clearer interview-history empty state. Findings that need
                an actual logic change — a confirmed <code>DecisionForm</code>{" "}
                state bug, several leaky/jargon-y error messages, missing{" "}
                <code>error.tsx</code>, a few data-integrity gaps, and most
                of the test-coverage gaps — are tracked in <code>§40</code>{" "}
                as a reviewed backlog rather than fixed opportunistically
                mid-audit.
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
