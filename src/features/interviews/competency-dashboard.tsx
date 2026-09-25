import { Badge } from "@/components/ui/badge";
import { t, type Locale } from "@/lib/i18n";

export interface CompetencyDashboardEntry {
  competencyId: string;
  name: string;
  weight: number;
  critical: boolean;
  percent: number | null;
  evaluated: number;
  na: number;
  /** Only meaningful when `critical` is true. */
  criticalHasEvidence: boolean;
  criticalMeets: boolean;
  criticalMin: number;
}

// The artifact's `.compgrid`/`.compcard` competency dashboard (plan Phase 14
// Task 14.4/§41): a 3-column colored card grid, driven entirely by data the
// Phase 2 scoring engines already compute — no new domain calculation here,
// only presentation over `CompetencyStat`/`CriticalCompetencyStatus`.
export function CompetencyDashboard({
  entries,
  locale = "en",
}: {
  entries: CompetencyDashboardEntry[];
  locale?: Locale;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map((entry) => (
        <CompetencyCard key={entry.competencyId} entry={entry} locale={locale} />
      ))}
    </div>
  );
}

function CompetencyCard({ entry, locale }: { entry: CompetencyDashboardEntry; locale: Locale }) {
  const failing = entry.critical && entry.criticalHasEvidence && !entry.criticalMeets;
  const pctLabel = entry.percent === null ? "—" : `${Math.round(entry.percent)}%`;
  const colorClass =
    entry.percent === null
      ? "text-na"
      : failing
        ? "text-fail"
        : entry.percent >= 80
          ? "text-pass"
          : entry.percent >= entry.criticalMin
            ? "text-borderline"
            : "text-fail";
  const fillClass =
    entry.percent === null
      ? "bg-na"
      : failing
        ? "bg-fail"
        : entry.percent >= 80
          ? "bg-pass"
          : entry.percent >= entry.criticalMin
            ? "bg-borderline"
            : "bg-fail";

  return (
    <div
      className={`flex flex-col gap-2 rounded-xl border p-3.5 ${
        failing ? "border-fail-border bg-fail-bg/40" : "border-border bg-card"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-[12.5px] font-semibold">{entry.name}</h4>
        {entry.critical ? (
          <Badge variant="outline" className="shrink-0 text-[10px] uppercase">
            {t(locale, "interview.criticalBadge")}
          </Badge>
        ) : null}
      </div>
      <div className={`font-mono text-[22px] font-bold ${colorClass}`}>{pctLabel}</div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
        <div className={`h-full ${fillClass}`} style={{ width: `${entry.percent ?? 0}%` }} />
      </div>
      <div className="flex flex-wrap gap-2 text-[10.5px] text-muted-foreground">
        <span>
          {t(locale, "interview.weightPrefix")}
          {entry.weight}%
        </span>
        <span>
          {t(locale, "interview.evaluatedPrefix")}
          {entry.evaluated}
          {entry.na > 0 ? ` · N/A ${entry.na}` : ""}
        </span>
      </div>
      {failing ? (
        <p className="flex items-center gap-1 text-[11px] font-semibold text-fail">
          {"⚠"} {t(locale, "interview.belowCriticalMinPrefix")}
          {entry.criticalMin}
          {t(locale, "interview.belowCriticalMinSuffix")}
        </p>
      ) : null}
    </div>
  );
}
