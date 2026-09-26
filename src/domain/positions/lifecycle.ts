// Pure Position lifecycle guard (plan Phase 23/§44.4/§44.8). A Position can
// be hard-deleted only when none of its templates have ever had a Session
// started against them. The caller (features/positions/mutations.ts and
// the Position detail page, via the shared features/positions/queries.ts
// `countUsedTemplatesForPosition`) queries how many templates actually have
// a Session; this function only judges that count, so it stays free of any
// database import, matching every other domain module in this codebase.

export interface PositionDeleteCheck {
  allowed: boolean;
  reason?: string;
}

export function canDeletePosition(usedTemplateCount: number): PositionDeleteCheck {
  if (usedTemplateCount > 0) {
    const templateWord = usedTemplateCount === 1 ? "template has" : "templates have";
    return {
      allowed: false,
      reason: `This position cannot be permanently deleted because ${usedTemplateCount} of its ${templateWord} been used to conduct interviews. Archive it instead to preserve that history.`,
    };
  }
  return { allowed: true };
}
