import { AppTopbar } from "@/components/layout/app-topbar";
import { ButtonLink } from "@/components/ui/button";
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
                Phase 13 — Hardening / Testing / UX Polish (done)
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
                a clearer interview-history empty state. A follow-up pass
                (<code>§40.7</code>) then resolved everything that needed an
                actual logic change: the confirmed <code>DecisionForm</code>{" "}
                state bug, every leaky/jargon-y error message, a missing{" "}
                <code>error.tsx</code>/<code>not-found.tsx</code>, the
                data-integrity gaps, and the test-coverage backlog (incl.{" "}
                <code>createNewTemplateVersion</code>, the delete/update/move
                mutations, and <code>listSessions</code> filters) — 267
                unit/component tests pass, up from 207.
              </CardDescription>
            </div>
            <ButtonLink size="sm" href="/interviews">
              Open History
            </ButtonLink>
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
