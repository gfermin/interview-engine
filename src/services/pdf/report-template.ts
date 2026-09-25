// Server-rendered HTML report template (plan §24, ADR-007) — a pure
// function from plain data to an HTML string. Colors are ported from the
// artifact's design tokens (src/app/globals.css, light mode only — a
// printed report doesn't need a dark variant); typography uses a system
// font stack rather than fetching IBM Plex Sans/Mono at render time, so
// generating a PDF has zero network dependency (plan §27), matching every
// other offline-capable part of the platform.
import type { DecisionMode, FinalDecision } from "@/domain/interviews/decision";
import type { InterviewLanguage } from "@/domain/interviews/interview-language";
import type { MandatoryRequirementStatus } from "@/domain/scoring/types";
import { t } from "@/lib/i18n";

export interface ReportCompetency {
  name: string;
  weight: number;
  critical: boolean;
  expectedDepth: string | null;
  percent: number | null;
  hasEvidence: boolean;
  meetsCriticalMin: boolean | null;
}

export interface ReportMandatoryRequirement {
  label: string;
  description: string | null;
  status: MandatoryRequirementStatus;
}

export interface ReportData {
  generatedAt: Date;
  /** The rendering language for this report (plan Phase 21/§28) — follows
   * the finalized session's template `interviewLanguage`, never the
   * application language at the moment "Generate Report" is clicked, so a
   * report about a Spanish-language interview always reads in Spanish
   * regardless of who generates it or what their own UI is set to. */
  language: InterviewLanguage;
  candidateName: string;
  candidateEmail: string | null;
  positionTitle: string;
  roleFamily: string | null;
  seniority: string | null;
  stageLabel: string;
  templateName: string;
  templateVersion: number;
  statusLabel: string;
  overall: number | null;
  completion: number;
  reason: string;
  competencies: ReportCompetency[];
  mandatoryRequirements: ReportMandatoryRequirement[];
  englishAssessment: { level: number | null; required: boolean; minLevel: number } | null;
  decision: { mode: DecisionMode; finalDecision: FinalDecision; reason: string | null };
  narrative: string;
}

const STATUS_COLORS: Record<string, { fg: string; bg: string; border: string }> = {
  Pass: { fg: "#1b8a52", bg: "#e3f6ea", border: "#b7e3c6" },
  Advance: { fg: "#1b8a52", bg: "#e3f6ea", border: "#b7e3c6" },
  Fail: { fg: "#c23b34", bg: "#fbe4e2", border: "#f1beb9" },
  "Not Advancing": { fg: "#c23b34", bg: "#fbe4e2", border: "#f1beb9" },
  Borderline: { fg: "#a86400", bg: "#fbeed9", border: "#f0d29c" },
  "Needs Review": { fg: "#a86400", bg: "#fbeed9", border: "#f0d29c" },
};
const DEFAULT_STATUS_COLOR = { fg: "#3457c2", bg: "#e6ebfb", border: "#c2cdf3" };

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pct(value: number | null): string {
  return value !== null ? `${Math.round(value)}%` : "—";
}

function mandatoryStatusLabel(language: InterviewLanguage, status: MandatoryRequirementStatus): string {
  return t(language, `reports.mandatoryStatus${status === "met" ? "Met" : status === "not_met" ? "NotMet" : "Unknown"}`);
}

function competencyRow(language: InterviewLanguage, c: ReportCompetency): string {
  const flag =
    c.critical && c.hasEvidence && c.meetsCriticalMin === false
      ? `<span class="tag tag-fail">${t(language, "reports.belowCriticalMinimum")}</span>`
      : c.critical
        ? `<span class="tag tag-critical">${t(language, "reports.criticalTag")}</span>`
        : "";
  return `
    <tr>
      <td>${escapeHtml(c.name)} ${flag}</td>
      <td class="num">${c.weight}%</td>
      <td class="num">${pct(c.percent)}</td>
      <td>${c.expectedDepth ? escapeHtml(c.expectedDepth) : "—"}</td>
    </tr>`;
}

function mandatoryRow(language: InterviewLanguage, r: ReportMandatoryRequirement): string {
  const cls = r.status === "met" ? "tag-pass" : r.status === "not_met" ? "tag-fail" : "tag-neutral";
  return `
    <tr>
      <td>${escapeHtml(r.label)}${r.description ? `<div class="muted">${escapeHtml(r.description)}</div>` : ""}</td>
      <td><span class="tag ${cls}">${mandatoryStatusLabel(language, r.status)}</span></td>
    </tr>`;
}

export function buildReportHtml(data: ReportData): string {
  const lang = data.language;
  const statusColor = STATUS_COLORS[data.statusLabel] ?? DEFAULT_STATUS_COLOR;

  const strengths = data.competencies.filter((c) => c.percent !== null && c.percent >= 80);
  const concerns = data.competencies.filter(
    (c) => (c.critical && c.hasEvidence && c.meetsCriticalMin === false) || (c.percent !== null && c.percent < 50)
  );

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #101a1c;
    background: #ffffff;
    margin: 0;
    padding: 0;
    font-size: 12px;
    line-height: 1.5;
  }
  .page { padding: 8px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.04em; color: #55696b; margin: 24px 0 8px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0c7c82; padding-bottom: 12px; }
  .meta { color: #55696b; font-size: 11.5px; margin-top: 4px; }
  .status-badge {
    display: inline-block; padding: 6px 14px; border-radius: 999px; font-weight: 600; font-size: 13px;
    color: ${statusColor.fg}; background: ${statusColor.bg}; border: 1px solid ${statusColor.border};
  }
  .stat-grid { display: flex; gap: 24px; margin-top: 12px; }
  .stat dt { font-size: 10.5px; text-transform: uppercase; color: #55696b; }
  .stat dd { margin: 2px 0 0; font-size: 18px; font-weight: 600; font-family: "Courier New", monospace; }
  .reason { color: #55696b; margin-top: 8px; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #d7e0dd; vertical-align: top; }
  th { font-size: 10.5px; text-transform: uppercase; color: #55696b; font-weight: 600; }
  td.num { font-family: "Courier New", monospace; }
  .muted { color: #55696b; font-size: 11px; }
  .tag { display: inline-block; padding: 1px 8px; border-radius: 999px; font-size: 10.5px; font-weight: 600; margin-left: 6px; }
  .tag-pass { color: #1b8a52; background: #e3f6ea; }
  .tag-fail { color: #c23b34; background: #fbe4e2; }
  .tag-critical { color: #a86400; background: #fbeed9; }
  .tag-neutral { color: #55696b; background: #eaf0ee; }
  .columns { display: flex; gap: 24px; }
  .columns > div { flex: 1; }
  ul.plain { margin: 4px 0 0; padding-left: 18px; }
  .narrative { background: #f5f7f6; border: 1px solid #d7e0dd; border-radius: 8px; padding: 12px; margin-top: 8px; }
  .decision-box { border: 1px solid #d7e0dd; border-radius: 8px; padding: 12px; margin-top: 8px; }
  .footer { margin-top: 28px; padding-top: 8px; border-top: 1px solid #d7e0dd; color: #55696b; font-size: 10px; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <h1>${escapeHtml(data.candidateName)}</h1>
      <div class="meta">
        ${escapeHtml(data.positionTitle)}${data.seniority ? ` — ${escapeHtml(data.seniority)}` : ""}${data.roleFamily ? ` (${escapeHtml(data.roleFamily)})` : ""}<br />
        ${escapeHtml(data.stageLabel)} · ${escapeHtml(data.templateName)} v${data.templateVersion}<br />
        ${data.candidateEmail ? `${escapeHtml(data.candidateEmail)}<br />` : ""}
        ${t(lang, "reports.generated")} ${data.generatedAt.toLocaleString()}
      </div>
    </div>
    <span class="status-badge">${escapeHtml(data.statusLabel)}</span>
  </div>

  <div class="stat-grid">
    <div class="stat"><dt>${t(lang, "reports.statOverall")}</dt><dd>${pct(data.overall)}</dd></div>
    <div class="stat"><dt>${t(lang, "reports.statCompletion")}</dt><dd>${Math.round(data.completion)}%</dd></div>
    <div class="stat"><dt>${t(lang, "reports.statFinalDecision")}</dt><dd>${data.decision.finalDecision}</dd></div>
  </div>
  <p class="reason">${escapeHtml(data.reason)}</p>

  <h2>${t(lang, "reports.decisionHeading")}</h2>
  <div class="decision-box">
    <strong>${data.decision.finalDecision}</strong> (${data.decision.mode.replace("_", " ")})
    ${data.decision.reason ? `<div class="muted" style="margin-top:4px;">${escapeHtml(data.decision.reason)}</div>` : ""}
  </div>

  <h2>${t(lang, "reports.competencyBreakdownHeading")}</h2>
  <table>
    <thead><tr><th>${t(lang, "reports.tableCompetency")}</th><th>${t(lang, "reports.tableWeight")}</th><th>${t(lang, "reports.tableScore")}</th><th>${t(lang, "reports.tableExpectedDepth")}</th></tr></thead>
    <tbody>${data.competencies.map((c) => competencyRow(lang, c)).join("")}</tbody>
  </table>

  <h2>${t(lang, "reports.mandatoryRequirementsHeading")}</h2>
  ${
    data.mandatoryRequirements.length === 0
      ? `<p class="muted">${t(lang, "reports.noMandatoryRequirements")}</p>`
      : `<table><tbody>${data.mandatoryRequirements.map((r) => mandatoryRow(lang, r)).join("")}</tbody></table>`
  }

  ${
    data.englishAssessment
      ? `<h2>${t(lang, "reports.englishAssessmentHeading")}</h2>
  <p>${t(lang, "reports.levelLabel")} <strong>${data.englishAssessment.level ?? t(lang, "reports.notAssessed")}</strong>${
          data.englishAssessment.required
            ? `${t(lang, "reports.requiredMinPrefix")}${data.englishAssessment.minLevel})`
            : t(lang, "reports.optionalSuffix")
        }</p>`
      : ""
  }

  <h2>${t(lang, "reports.strengthsAndConcernsHeading")}</h2>
  <div class="columns">
    <div>
      <strong>${t(lang, "reports.strengthsLabel")}</strong>
      ${
        strengths.length === 0
          ? `<p class="muted">${t(lang, "reports.noStrengthsYet")}</p>`
          : `<ul class="plain">${strengths.map((c) => `<li>${escapeHtml(c.name)} (${pct(c.percent)})</li>`).join("")}</ul>`
      }
    </div>
    <div>
      <strong>${t(lang, "reports.concernsLabel")}</strong>
      ${
        concerns.length === 0
          ? `<p class="muted">${t(lang, "reports.noConcerns")}</p>`
          : `<ul class="plain">${concerns.map((c) => `<li>${escapeHtml(c.name)} (${pct(c.percent)})</li>`).join("")}</ul>`
      }
    </div>
  </div>

  <h2>${t(lang, "reports.narrativeSummaryHeading")}</h2>
  <p class="narrative">${escapeHtml(data.narrative)}</p>

  <div class="footer">${t(lang, "reports.footer")}</div>
</div>
</body>
</html>`;
}
