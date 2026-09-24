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
    phase: "Phase 9",
    title: "Scoring & Decision Engine",
    detail:
      "Wire the ScoringEngine into a Summary screen: calculated status/reason, the Mandatory Requirement gate, and the human accept/override/forced-call decision workflow.",
  },
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
                Phase 8 — Live Interview Engine
              </CardTitle>
              <CardDescription className="mt-1">
                The artifact&apos;s question-card rating UI — 0-5/N/A rate
                bar, collapsible expected-answer/rubric/follow-up panels,
                autosaving notes — rebuilt as componentized, database-backed
                React. Every rating recomputes the same{" "}
                <code>ScoringEngine</code>/<code>CompletenessEngine</code>{" "}
                from Phase 2 in place, driving live overall/completion/
                critical chips and a per-competency section nav with status
                icons (○/●/✓/⚠), exactly like the artifact&apos;s{" "}
                <code>recalc()</code>-on-every-interaction pattern — now
                backed by real persistence instead of <code>localStorage</code>.
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
