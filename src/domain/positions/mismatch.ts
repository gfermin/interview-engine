// Plan §39.3 / Phase 34/L-06 — moved out of templates/[id]/page.tsx (a UI
// component) into domain/positions/, matching this codebase's convention of
// keeping pure business-rule functions out of the page layer even when only
// one page currently calls them.

/** Non-blocking mismatch check between a Position's interviewer-selected
 * Role Family/Seniority and what the AI's Job Analysis detected in the JD
 * text — the system never overrides the human's selection, it only flags a
 * divergence for review. */
export function isPositionFieldMismatched(selected: string | null, detected: string | null): boolean {
  if (!selected || !detected) return false;
  return selected.trim().toLowerCase() !== detected.trim().toLowerCase();
}
