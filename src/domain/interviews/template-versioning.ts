// Pure template-versioning rules (plan §22, ADR-008). Nothing here imports
// from src/db or src/services — the persistence layer (src/features/templates)
// calls these functions with plain data and acts on their plain-data verdicts.

export type TemplateStatus = "draft" | "approved" | "locked";

export interface TemplateLike {
  status: TemplateStatus;
}

export interface CompetencyLike {
  weight: number;
}

/**
 * A template is mutable (competencies/requirements/questions can be added,
 * edited, removed, reordered) only while `status === "draft"`. `approved`
 * (published, not yet used by a Session) and `locked` (a Session references
 * this exact version — plan §22/ADR-008) are both terminal for direct edits;
 * the only path forward is {@link canCreateNewVersion}.
 *
 * Written in Phase 4, ahead of Sessions existing, and exercised for real
 * once Phase 7 started referencing templates from Sessions — plan §21/
 * Phase 4's "write the guard now, exercise it in Phase 7."
 */
export function isTemplateEditable(template: TemplateLike): boolean {
  return template.status === "draft";
}

/** `approved` or `locked` templates can be forked into a new draft version;
 * a `draft` template has no reason to fork — it's already editable. */
export function canCreateNewVersion(template: TemplateLike): boolean {
  return template.status === "approved" || template.status === "locked";
}

export interface PublishCheck {
  publishable: boolean;
  errors: string[];
}

/**
 * Validates a draft template is ready to publish (draft -> approved). This
 * is the "block only on publish" half of Phase 4's weight-sum UX note — the
 * builder UI itself never blocks a mid-edit imbalance, only this check does.
 */
export function checkPublishable(
  template: TemplateLike,
  competencies: CompetencyLike[]
): PublishCheck {
  const errors: string[] = [];

  if (template.status !== "draft") {
    errors.push("Only a draft template can be published.");
  }
  if (competencies.length === 0) {
    errors.push("Add at least one competency before publishing.");
  }

  const weightSum = sumWeights(competencies);
  if (competencies.length > 0 && weightSum !== 100) {
    errors.push(
      `Competency weights must sum to 100% (currently ${weightSum}%).`
    );
  }

  return { publishable: errors.length === 0, errors };
}

export function sumWeights(competencies: CompetencyLike[]): number {
  return competencies.reduce((sum, c) => sum + c.weight, 0);
}

/**
 * A Session can only be started against a published Template — `approved`
 * (reviewed, not yet used) or `locked` (already in use by another Session;
 * one version can back more than one candidate). A `draft` is excluded: it
 * hasn't been through the human review/approve gate (ADR-004) yet.
 *
 * This is the guard Phase 4 wrote ahead of time, first exercised for real
 * by Phase 7's Candidate/Session flow (plan §21/Phase 4's "write the guard
 * now, exercise it in Phase 7").
 */
export function canStartSession(template: TemplateLike): boolean {
  return template.status === "approved" || template.status === "locked";
}

/**
 * Lock-on-first-use (plan §22, ADR-008): the moment a Session is created
 * against an `approved` version, it transitions to `locked` so further
 * edits require forking a new version instead of mutating history out from
 * under a completed/in-progress evaluation. An already-`locked` template
 * stays `locked` — a second or third Session against the same version
 * doesn't need to (and can't) re-trigger the transition.
 */
export function statusAfterSessionCreated(template: TemplateLike): TemplateStatus {
  return template.status === "approved" ? "locked" : template.status;
}

// No `canDeleteTemplate(template: TemplateLike)` here (plan Phase 23/§44.4
// originally proposed one, status-based) — a real bug surfaced during
// testing: `status` only flips to `locked` via a second, non-atomic write
// in `startInterviewSession` (features/candidates/mutations.ts), so it can
// lag actual Session existence. The "can this template be deleted" check
// instead lives as `hasSessionsForTemplate` (features/templates/queries.ts),
// querying Session existence directly — the same ground truth the DB's own
// `RESTRICT` on `interview_sessions.template_id` protects — shared by both
// the mutation and the detail page so they can never diverge.
