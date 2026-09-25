// @vitest-environment node
//
// §40.5 item 5: zero Server Action tests existed across any actions.ts file
// — the error-to-{error} mapping, the redirect/revalidatePath calls, and
// (for startSessionAction) the new §40.2/§40.4 candidate-existence guard
// were all unverified at this layer. `next/navigation`/`next/cache` are
// mocked because calling the real `redirect`/`revalidatePath` outside an
// actual Next.js request context throws.
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { db } from "@/db";
import { positions } from "@/db/schema";
import { createTemplate, publishTemplate } from "@/features/templates/mutations";
import { createCandidateAction, startSessionAction } from "./actions";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeEach(() => {
  vi.mocked(redirect).mockClear();
  vi.mocked(revalidatePath).mockClear();
});

function formData(values: Record<string, string>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(values)) fd.set(key, value);
  return fd;
}

describe("createCandidateAction", () => {
  it("returns field errors and doesn't redirect on invalid input", async () => {
    const result = await createCandidateAction(undefined, formData({ name: "" }));

    expect(result?.error).toBeTruthy();
    expect(result?.fieldErrors?.name).toBeTruthy();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("creates the candidate and redirects to their detail page on success", async () => {
    await createCandidateAction(undefined, formData({ name: `Test Candidate ${randomUUID()}` }));

    expect(revalidatePath).toHaveBeenCalledWith("/candidates");
    expect(redirect).toHaveBeenCalledWith(expect.stringMatching(/^\/candidates\//));
  });
});

describe("startSessionAction", () => {
  async function createDraftTemplate() {
    const [position] = await db
      .insert(positions)
      .values({ title: `Test Position ${randomUUID()}` })
      .returning();
    return createTemplate({ positionId: position.id, stage: "technical", name: "T", interviewLanguage: "en" });
  }

  it("returns a field error on missing templateId, without calling the mutation", async () => {
    const result = await startSessionAction(randomUUID(), undefined, formData({}));
    expect(result?.error).toBeTruthy();
  });

  it("surfaces a clean error (not a stack trace) when the template isn't published yet", async () => {
    const template = await createDraftTemplate();
    const { createCandidate } = await import("./mutations");
    const candidate = await createCandidate({ name: `Test Candidate ${randomUUID()}`, email: null, notes: null });

    const result = await startSessionAction(candidate.id, undefined, formData({ templateId: template.id }));

    expect(result?.error).toMatch(/published/i);
  });

  it("§40.2/§40.4: surfaces a clean 'Candidate not found' message instead of a raw FK-constraint error for a bad candidateId", async () => {
    const { createCompetency } = await import("@/features/templates/mutations");
    const [position] = await db
      .insert(positions)
      .values({ title: `Test Position ${randomUUID()}` })
      .returning();
    const template = await createTemplate({ positionId: position.id, stage: "technical", name: "T", interviewLanguage: "en" });
    await createCompetency(template.id, { name: "x", weight: 100, critical: false, expectedDepth: null });
    await publishTemplate(template.id);

    const result = await startSessionAction(randomUUID(), undefined, formData({ templateId: template.id }));

    expect(result?.error).toBe("Candidate not found.");
  });

  it("revalidates on success", async () => {
    const [position] = await db
      .insert(positions)
      .values({ title: `Test Position ${randomUUID()}` })
      .returning();
    const template = await createTemplate({ positionId: position.id, stage: "technical", name: "T", interviewLanguage: "en" });
    const { createCompetency } = await import("@/features/templates/mutations");
    await createCompetency(template.id, { name: "x", weight: 100, critical: false, expectedDepth: null });
    await publishTemplate(template.id);

    const { createCandidate } = await import("./mutations");
    const candidate = await createCandidate({ name: `Test Candidate ${randomUUID()}`, email: null, notes: null });

    const result = await startSessionAction(candidate.id, undefined, formData({ templateId: template.id }));

    expect(result?.error).toBeUndefined();
    expect(revalidatePath).toHaveBeenCalledWith(`/candidates/${candidate.id}`);
  });
});
