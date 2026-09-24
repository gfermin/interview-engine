// Pure InterviewSession lifecycle guard (plan §16's documented lifecycle:
// in_progress -> completed -> decided -> reopened). Mirrors ADR-008's
// "write the guard now, exercise it later" pattern: Phase 11 builds the
// "Reopen" action that clears this back to editable, but the guard itself
// belongs here, the moment there's a "decided" state to protect ratings
// from — a decision must stay meaningful against the evidence that produced
// it, the same reasoning ADR-008 applies to Templates.

export type SessionStatus = "in_progress" | "completed" | "decided";

export interface SessionLike {
  status: SessionStatus;
}

/** Ratings/notes can only change while a session is `in_progress`. Once
 * it's `completed` (interviewer moved on to the Summary screen) or
 * `decided` (a human decision was recorded), the evidence is frozen —
 * re-opening it is Phase 11's explicit, logged action, not a side effect of
 * revisiting the rating screen. */
export function isSessionEditable(session: SessionLike): boolean {
  return session.status === "in_progress";
}

/** `decided` is the terminal, fully-frozen state — a recorded
 * `InterviewDecision` exists and every input that produced it should stay
 * exactly as it was until an explicit Reopen (plan §16/Phase 11). */
export function isSessionDecided(session: SessionLike): boolean {
  return session.status === "decided";
}

/** A report is "generated only from a finalized InterviewSession + its
 * InterviewDecision" (plan §24) — `decided` is the only status that
 * guarantees an `InterviewDecision` row exists to report on. */
export function canGenerateReport(session: SessionLike): boolean {
  return isSessionDecided(session);
}

/**
 * Reopen (plan §16/Phase 11) undoes whichever lock is currently in effect —
 * `completed` (rating finished, no decision yet) or `decided` (a decision
 * was recorded) — sending the session back to `in_progress`. Equivalent to
 * "not editable," but named for its own call sites so a reader doesn't have
 * to mentally invert `isSessionEditable` to see when Reopen applies.
 */
export function canReopenSession(session: SessionLike): boolean {
  return !isSessionEditable(session);
}
