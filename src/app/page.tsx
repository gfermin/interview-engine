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
    phase: "Phase 10",
    title: "PDF Reporting",
    detail:
      "Generate a professional PDF from a finalized InterviewSession using Playwright print-to-PDF from a server-rendered HTML template.",
  },
  {
    phase: "Phase 11",
    title: "Persistence / History / Versioning Hardening",
    detail:
      "Interview history list/search and an explicit 'reopen' flow for a finalized session, hardening the template-versioning guarantees before the POC is done.",
  },
  {
    phase: "Phase 12",
    title: "BambooHR Integration POC",
    detail:
      "Validate real BambooHR API capabilities and implement a minimal, mocked-by-default integration — deferred until the core loop (Phases 1-11) is proven.",
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
                Phase 9 — Scoring &amp; Decision Engine
              </CardTitle>
              <CardDescription className="mt-1">
                The live rating screen&apos;s &ldquo;View Summary&rdquo;
                leads to a Summary/Decision screen reproducing the
                artifact&apos;s decision panel: the full calculated status/
                reason/breakdown from the unmodified Phase 2{" "}
                <code>ScoringEngine</code>, a Mandatory Requirement gate with
                its own tri-state control per requirement (a mechanism the
                original artifact never built at all), an optional English
                assessment feeding the same gate, and the
                accept/override/forced-call decision workflow — a
                BORDERLINE result only ever offers a forced call, never a
                silent conversion to FAIL. Recording a decision moves the
                session to a read-only <code>decided</code> state; changing
                it overwrites the prior decision with no history kept, a
                confirmed POC limitation (plan §21/§38).
              </CardDescription>
            </div>
            <Button size="sm" render={<Link href="/candidates">Open Candidates</Link>} />
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
