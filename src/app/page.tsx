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
    phase: "Phase 8",
    title: "Live Interview Engine",
    detail:
      "The artifact's question-card rating UI (0-5/N/A, disclosure panels, live score chips), rebuilt as componentized, database-backed React.",
  },
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
                Phase 7 — Candidate Management
              </CardTitle>
              <CardDescription className="mt-1">
                Candidate CRUD replaces the artifact&apos;s single-candidate-
                slot model with a real roster. Starting an Interview Session
                against a published Template is the first real exercise of
                the lock-on-use guard Phase 4 wrote ahead of time: an
                &ldquo;approved&rdquo; version transitions to
                &ldquo;locked&rdquo; the moment a Session references it
                (ADR-008), and a &ldquo;draft&rdquo; template can&apos;t be
                used to interview anyone until it&apos;s published.
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
