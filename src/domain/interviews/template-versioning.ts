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
 * Written now, ahead of Phase 7 (Sessions don't exist yet), so the guard is
 * exercised for real the moment Sessions start referencing templates rather
 * than being retrofitted later — plan §21/Phase 4's "write the guard now,
 * exercise it in Phase 7."
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
