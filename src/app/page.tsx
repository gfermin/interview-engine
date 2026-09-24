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
  {
    phase: "Phase 13",
    title: "Hardening / Testing / UX Polish",
    detail:
      "Fill test coverage gaps and polish rough UX edges found during real usage of Phases 1-11 — no new features.",
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
                Phase 10 — PDF Reporting
              </CardTitle>
              <CardDescription className="mt-1">
                A &ldquo;Generate Report&rdquo; action on the Summary
                screen — available only once a session is{" "}
                <code>decided</code> — renders a server-side HTML report
                template through headless Chromium (<code>playwright</code>,
                ADR-007) into a real PDF: candidate/position/stage/version,
                the calculated status and decision, a competency breakdown
                table, the Mandatory Requirement gate, the English
                assessment, deterministic strengths/concerns, and the
                narrative summary — every field the artifact&apos;s
                plain-text report had, laid out as a designed document. The
                PDF is stored on disk and referenced by an immutable{" "}
                <code>InterviewReport</code> row; regenerating never
                overwrites a prior report, it adds another one.
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
