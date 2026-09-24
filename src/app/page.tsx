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
    phase: "Phase 5",
    title: "AI JD Analysis & Question Generation",
    detail:
      "Position + Role Family + Seniority + Stage + JD, jointly, through JD analysis, a competency model, a question blueprint, and seniority-aware rubrics.",
  },
  {
    phase: "Phase 6",
    title: "Interview Template Review / Approval",
    detail:
      "Human review/edit/approve of AI-generated content, including the role/seniority mismatch banner.",
  },
  {
    phase: "Phase 7",
    title: "Candidate Management",
    detail:
      "Candidate CRUD and roster, replacing the artifact's single-candidate-slot model — the first real use of a Template's lock-on-use guard.",
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
                Phase 4 — Interview Template Engine
              </CardTitle>
              <CardDescription className="mt-1">
                Templates are versioned and publishable: hand-author
                Competencies (with per-competency Expected Depth),
                MandatoryRequirements, and Questions for both the Technical
                Interview and First Screening stages, then publish — a
                template locks the moment a candidate Session references it
                (Phase 7), and further edits require a new version.
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
