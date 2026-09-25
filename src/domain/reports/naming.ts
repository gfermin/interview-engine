// Centralized report naming (plan Phase 18/§42) — the single place that
// turns a finalized session's candidate/position/stage/date into the two
// presentation-only strings a report is identified by. Neither value is
// ever used as a DB key: `InterviewReport.id`/`filePath` stay UUID-based
// (plan §7 — identity vs. name), so renaming logic here can never collide
// with, or need to migrate, storage.

export interface ReportNamingInput {
  candidateName: string;
  positionTitle: string;
  stageLabel: string;
  generatedAt: Date;
  /** The report's own stable id — used only as a filename disambiguator
   * (see {@link buildInterviewReportFilename}), never rendered as-is. */
  reportId: string;
}

/** `{Candidate} — {Position} — {Stage}` (plan §5) — the candidate's name
 * leads, since it's the identifier a human scans for first among several
 * reports for the same position/stage. */
export function buildInterviewReportDisplayName(input: ReportNamingInput): string {
  return `${input.candidateName} — ${input.positionTitle} — ${input.stageLabel}`;
}

/** UTC-based Y-M-D — deterministic regardless of the host's local timezone,
 * since a report's generation moment is already fixed once `generatedAt` is
 * captured; there's no reason the *filename* should vary by where the app
 * happens to run. */
function formatDateForFilename(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Strips accents (NFD-decompose, drop combining marks), then collapses
 * anything that isn't a letter/digit into a single underscore, trimming any
 * leading/trailing underscore left behind — e.g. `"José O'Brien-Pérez"` ->
 * `"Jose_O_Brien_Perez"`. Pure string hygiene, no locale-awareness needed
 * beyond Unicode normalization since the result is filesystem-safe ASCII. */
function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// Keeps a generated filename readable rather than merely unique — long
// position titles or stage names get truncated before the date/id suffix
// rather than producing a several-hundred-character path.
const MAX_SLUG_SEGMENT_LENGTH = 60;

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? value.slice(0, maxLength).replace(/_+$/g, "") : value;
}

/**
 * Filesystem-safe, candidate-identifiable PDF filename (plan §6):
 * `{Candidate}_{Position}_{Stage}_{YYYY-MM-DD}_{reportIdPrefix}.pdf`.
 *
 * The report-id prefix (first 8 chars of the UUID) is what actually
 * guarantees uniqueness — two interviews for the same candidate on the same
 * day, or two candidates who happen to share a name, produce two different
 * filenames without needing any cross-record coordination, matching plan
 * §41's "filename uniqueness must not rely exclusively on candidate name."
 */
export function buildInterviewReportFilename(input: ReportNamingInput): string {
  const parts = [
    truncate(slugify(input.candidateName), MAX_SLUG_SEGMENT_LENGTH),
    truncate(slugify(input.positionTitle), MAX_SLUG_SEGMENT_LENGTH),
    truncate(slugify(input.stageLabel), MAX_SLUG_SEGMENT_LENGTH),
    formatDateForFilename(input.generatedAt),
    input.reportId.replace(/-/g, "").slice(0, 8),
  ].filter((part) => part.length > 0);

  return `${parts.join("_")}.pdf`;
}
