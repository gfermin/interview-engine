import { eq } from "drizzle-orm";
import { db } from "@/db";
import { interviewTemplates, jobDescriptions } from "@/db/schema";
import { getActiveJobDescription } from "./queries";

/**
 * Create or update a Position's Job Description text.
 *
 * Plan §16/Phase 3: a JobDescription is versioned "if edited after a
 * template references it." Concretely: if no InterviewTemplate currently
 * references the active JD, editing it is an in-place update (same row,
 * same version) — this is the only reachable path today, since template
 * creation doesn't exist until Phase 4. If a template DOES reference it,
 * editing instead supersedes the old version and creates a new one, so a
 * template's historical evaluations keep meaning what they meant when the
 * candidate was interviewed against them.
 */
export async function saveJobDescription(positionId: string, rawText: string) {
  const current = await getActiveJobDescription(positionId);

  if (!current) {
    const [created] = await db
      .insert(jobDescriptions)
      .values({ positionId, rawText, status: "active" })
      .returning();
    return created;
  }

  const referencedByTemplate = await db.query.interviewTemplates.findFirst({
    where: eq(interviewTemplates.jobDescriptionId, current.id),
  });

  if (!referencedByTemplate) {
    const [updated] = await db
      .update(jobDescriptions)
      .set({ rawText, updatedAt: new Date() })
      .where(eq(jobDescriptions.id, current.id))
      .returning();
    return updated;
  }

  await db
    .update(jobDescriptions)
    .set({ status: "superseded" })
    .where(eq(jobDescriptions.id, current.id));

  const [created] = await db
    .insert(jobDescriptions)
    .values({
      positionId,
      rawText,
      status: "active",
      version: current.version + 1,
    })
    .returning();
  return created;
}
