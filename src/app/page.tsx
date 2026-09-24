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
    phase: "Phase 7",
    title: "Candidate Management",
    detail:
      "Candidate CRUD and roster, replacing the artifact's single-candidate-slot model — the first real use of a Template's lock-on-use guard.",
  },
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
                Phase 6 — Interview Template Review &amp; Approval
              </CardTitle>
              <CardDescription className="mt-1">
                &ldquo;Analyze Job Description&rdquo; extracts a JobAnalysis
                (with a non-blocking role/seniority mismatch flag),
                &ldquo;Generate Draft&rdquo; produces a full
                Competency/MandatoryRequirement/Question set, and each
                question has its own &ldquo;Regenerate&rdquo; — re-calls AI
                for just that one question, in place, leaving its siblings
                and the rest of the template untouched. Everything is
                Zod-validated before it touches the database. Backed by
                Claude (<code>ANTHROPIC_API_KEY</code>, recommended) or
                Gemini&apos;s free tier (<code>GEMINI_API_KEY</code>) behind
                the same <code>AIProvider</code> interface.
              </CardDescription>
            </div>
            <Button size="sm" render={<Link href="/templates">Open Templates</Link>} />
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
