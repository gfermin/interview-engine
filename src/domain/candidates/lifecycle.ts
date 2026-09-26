// Pure Candidate lifecycle guard (plan Phase 23/§44.4/§44.8) — a Candidate
// can be hard-deleted only when they have zero Interview Sessions. This is
// the single highest-risk gap the analysis identified (§44.3): nothing at
// the database level restricts Candidate -> InterviewSession, so this check
// is the only thing standing between a "Delete Candidate" click and
// silently destroying a finalized hiring evaluation. The caller
// (features/candidates/mutations.ts) queries the session count; this
// function only judges it.

export interface CandidateDeleteCheck {
  allowed: boolean;
  reason?: string;
}

export function canDeleteCandidate(sessionCount: number): CandidateDeleteCheck {
  if (sessionCount > 0) {
    const sessionWord = sessionCount === 1 ? "session exists" : "sessions exist";
    return {
      allowed: false,
      reason: `This candidate cannot be permanently deleted because ${sessionCount} interview ${sessionWord} for them. Archive instead to preserve that history.`,
    };
  }
  return { allowed: true };
}
