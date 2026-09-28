export { cn } from "cn"

/** Renders a nullable percent value as "NN%", or an em dash when there's
 * nothing to show yet (plan Phase 34/L-05) — replaces the same
 * `value !== null ? \`${Math.round(value)}%\` : "—"` expression repeated
 * across the reports/interviews pages and PDF template. */
export function formatPercent(value: number | null | undefined): string {
  return value !== null && value !== undefined ? `${Math.round(value)}%` : "—";
}
