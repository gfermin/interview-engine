// @vitest-environment node
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { interviewTemplates, jobDescriptions, positions } from "@/db/schema";
import { saveJobDescription } from "./job-description";
import { getActiveJobDescription } from "./queries";

async function createTestPosition() {
  const [position] = await db
    .insert(positions)
    .values({ title: `Test Position ${randomUUID()}` })
    .returning();
  return position;
}

// Plan Phase 3 / §16: a JobDescription is versioned "if edited after a
// template references it" — otherwise editing is a plain in-place update.
// This is a no-op-safe guard today (no UI creates templates until Phase 4),
// exercised here directly at the persistence layer.
describe("saveJobDescription", () => {
  it("creates version 1, active, when a Position has no Job Description yet", async () => {
    const position = await createTestPosition();

    const jd = await saveJobDescription(position.id, "We are looking for...");

    expect(jd.version).toBe(1);
    expect(jd.status).toBe("active");
    expect(jd.positionId).toBe(position.id);
  });

  it("updates the existing row in place when no template references it", async () => {
    const position = await createTestPosition();
    const first = await saveJobDescription(position.id, "Original JD text.");

    const second = await saveJobDescription(position.id, "Edited JD text.");

    expect(second.id).toBe(first.id); // same row, not a new version
    expect(second.version).toBe(1);
    expect(second.rawText).toBe("Edited JD text.");

    const allVersions = await db.query.jobDescriptions.findMany({
      where: eq(jobDescriptions.positionId, position.id),
    });
    expect(allVersions).toHaveLength(1);
  });

  it("creates a new version and supersedes the old one once a template references the JD", async () => {
    const position = await createTestPosition();
    const first = await saveJobDescription(position.id, "Original JD text.");

    // Simulate what Phase 4 will do when a template is published against
    // this JD version — no template-creation UI exists yet, so this is
    // exercised directly against the schema.
    await db.insert(interviewTemplates).values({
      positionId: position.id,
      jobDescriptionId: first.id,
      stage: "technical",
      name: "Referencing template",
    });

    const second = await saveJobDescription(position.id, "Edited JD text.");

    expect(second.id).not.toBe(first.id);
    expect(second.version).toBe(2);
    expect(second.status).toBe("active");

    const supersededFirst = await db.query.jobDescriptions.findFirst({
      where: eq(jobDescriptions.id, first.id),
    });
    expect(supersededFirst?.status).toBe("superseded");
    expect(supersededFirst?.rawText).toBe("Original JD text."); // history preserved

    const active = await getActiveJobDescription(position.id);
    expect(active?.id).toBe(second.id);
  });
});
