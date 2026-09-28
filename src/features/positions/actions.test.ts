// @vitest-environment node
//
// AUDIT gap L-16/Phase 34 — deletePositionAction had no Server Action-level
// coverage; `next/navigation`/`next/cache` are mocked because calling the
// real `redirect`/`revalidatePath` outside an actual Next.js request context
// throws (same convention as candidates/actions.test.ts).
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { positions } from "@/db/schema";
import { createCandidate, startInterviewSession } from "@/features/candidates/mutations";
import { createCompetency, createTemplate, publishTemplate } from "@/features/templates/mutations";
import { deletePositionAction } from "./actions";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeEach(() => {
  vi.mocked(redirect).mockClear();
  vi.mocked(revalidatePath).mockClear();
});

describe("deletePositionAction", () => {
  it("deletes and redirects to the list on success", async () => {
    const [position] = await db
      .insert(positions)
      .values({ title: `Test Position ${randomUUID()}` })
      .returning();

    await deletePositionAction(position.id);

    expect(revalidatePath).toHaveBeenCalledWith("/positions");
    expect(redirect).toHaveBeenCalledWith("/positions");
  });

  // A stale request (the button rendered when deletion was allowed, but a
  // Session got started against one of this Position's Templates before
  // the click landed) used to be a silent no-op that still redirected to
  // the list as if it had succeeded. It must now redirect back to the
  // Position's own page instead, where the precondition check renders its
  // existing "cannot be deleted" note.
  it("redirects back to the position's own page, not the list, when delete is blocked", async () => {
    const [position] = await db
      .insert(positions)
      .values({ title: `Test Position ${randomUUID()}` })
      .returning();
    const template = await createTemplate({
      positionId: position.id,
      stage: "technical",
      name: "T",
      interviewLanguage: "en",
    });
    await createCompetency(template.id, { name: "x", weight: 100, critical: false, expectedDepth: null });
    await publishTemplate(template.id);
    const candidate = await createCandidate({ name: `Test Candidate ${randomUUID()}`, email: null, notes: null });
    await startInterviewSession(candidate.id, template.id);

    await deletePositionAction(position.id);

    expect(revalidatePath).toHaveBeenCalledWith(`/positions/${position.id}`);
    expect(redirect).toHaveBeenCalledWith(`/positions/${position.id}`);
    expect(redirect).not.toHaveBeenCalledWith("/positions");
  });
});
