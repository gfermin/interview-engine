import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { interviewTemplates, jobDescriptions } from "@/db/schema";

/**
 * Create or update a Position's Job Description text.
 *
 * Plan §16/Phase 3: a JobDescription is versioned "if edited after a
 * template references it." Concretely: if no InterviewTemplate currently
 * references the active JD, editing it is an in-place update (same row,
 * same version). If a template DOES reference it, editing instead
 * supersedes the old version and creates a new one, so a template's
 * historical evaluations keep meaning what they meant when the candidate
 * was interviewed against them.
 *
 * Plan Phase 31/AUDIT-017 — the read-then-write (is there an active JD? is
 * it referenced?) is wrapped in one transaction so two concurrent calls for
 * the same Position can't both read "no active JD yet" and each insert
 * their own "active" row. better-sqlite3 transactions must be synchronous
 * (see templates/mutations.ts's identical note), hence `.get()`/`.run()`
 * rather than `await`/`.returning()`. `behavior: "immediate"` acquires the
 * write lock up front rather than SQLite's default deferred behavior (lock
 * acquired lazily at the first write) — without it, two connections can
 * each take a shared read lock on the initial SELECT and then both fail to
 * upgrade to a write lock ("database is locked"), which a `busy_timeout`
 * alone doesn't reliably resolve for this exact read-then-write shape.
 */
export async function saveJobDescription(positionId: string, rawText: string) {
  return db.transaction(
    (tx) => {
      const current = tx
        .select()
        .from(jobDescriptions)
        .where(and(eq(jobDescriptions.positionId, positionId), eq(jobDescriptions.status, "active")))
        .orderBy(desc(jobDescriptions.version))
        .get();

      if (!current) {
        return tx
          .insert(jobDescriptions)
          .values({ positionId, rawText, status: "active" })
          .returning()
          .get();
      }

      const referencedByTemplate = tx
        .select({ id: interviewTemplates.id })
        .from(interviewTemplates)
        .where(eq(interviewTemplates.jobDescriptionId, current.id))
        .get();

      if (!referencedByTemplate) {
        return tx
          .update(jobDescriptions)
          .set({ rawText, updatedAt: new Date() })
          .where(eq(jobDescriptions.id, current.id))
          .returning()
          .get();
      }

      tx.update(jobDescriptions).set({ status: "superseded" }).where(eq(jobDescriptions.id, current.id)).run();

      return tx
        .insert(jobDescriptions)
        .values({
          positionId,
          rawText,
          status: "active",
          version: current.version + 1,
        })
        .returning()
        .get();
    },
    { behavior: "immediate" }
  );
}
