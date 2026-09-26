import type { InterviewStatus } from "@/domain/scoring/types";
import { t, type Locale } from "@/lib/i18n";
import { PerformanceBar } from "./performance-bar";
import { StatusBadge } from "./status-badge";

// The artifact's sticky topbar scoreboard (plan Phase 14 Task 14.2/§41): a
// sibling to the generic `AppTopbar` (which stays unchanged and in use on
// every other route — ADR-010), used only on the live-rating and Summary
// screens, where a persistent live status/performance view is the whole
// point of the artifact's shell.
export function InterviewScoreboard({
  candidateName,
  subtitle,
  overall,
  completion,
  criticalMet,
  criticalTotal,
  status,
  statusLabel,
  borderlineMin,
  passThreshold,
  englishLevel,
  locale = "en",
}: {
  candidateName: string;
  subtitle: string;
  overall: number | null;
  completion: number;
  criticalMet: number;
  criticalTotal: number;
  status: InterviewStatus;
  statusLabel: string;
  borderlineMin: number;
  passThreshold: number;
  /** Omit entirely when the stage has no supplementary-assessment module;
   * `null` means the module is active but nothing's been recorded yet. */
  englishLevel?: number | null;
  locale?: Locale;
}) {
  return (
    <header className="sticky top-0 z-20 flex flex-col gap-3 border-b border-border bg-card px-6 py-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold">{candidateName}</h2>
          <p className="text-[11.5px] text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <ScoreChip
            label={t(locale, "interview.chipOverall")}
            value={overall !== null ? `${Math.round(overall)}%` : "—"}
          />
          <ScoreChip label={t(locale, "interview.chipCompletion")} value={`${Math.round(completion)}%`} />
          <ScoreChip label={t(locale, "interview.chipCritical")} value={`${criticalMet}/${criticalTotal}`} />
          {englishLevel !== undefined ? (
            <ScoreChip
              label={t(locale, "interview.chipEnglish")}
              value={englishLevel !== null ? `${englishLevel}/5` : "—"}
            />
          ) : null}
          <StatusBadge status={status} label={statusLabel} className="ml-1" />
        </div>
      </div>
      <PerformanceBar overall={overall} borderlineMin={borderlineMin} passThreshold={passThreshold} />
    </header>
  );
}

function ScoreChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-start gap-0.5 rounded-lg border border-border bg-muted/40 px-2.5 py-1 min-w-16">
      <span className="text-[9.5px] font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
      <span className="font-mono text-[15px] font-semibold">{value}</span>
    </div>
  );
}
