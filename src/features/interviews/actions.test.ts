// @vitest-environment node
//
// §40.5 item 5: interviews/actions.ts had no Server Action-level coverage.
// This also exercises the §40.2 reworded decision-error messages end to
// end, through the same action the Summary screen's form actually calls.
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { candidates, interviewSessions, positions } from "@/db/schema";
import { createCompetency, createQuestion, createTemplate } from "@/features/templates/mutations";
import { rateQuestion } from "./mutations";
import { finishRatingAction, recordDecisionAction, reopenSessionAction } from "./actions";

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

async function createSessionFixture() {
  const [position] = await db
    .insert(positions)
    .values({ title: `Test Position ${randomUUID()}` })
    .returning();
  const template = await createTemplate({ positionId: position.id, stage: "technical", name: "T", interviewLanguage: "en" });
  const competency = await createCompetency(template.id, {
    name: "Programming",
    weight: 100,
    critical: false,
    expectedDepth: null,
  });
  const question = await createQuestion(template.id, {
    competencyId: competency.id,
    text: "Q",
    difficulty: "easy",
    importance: "core",
    expected: null,
    strong: null,
    acceptable: null,
    concepts: [],
    redFlags: [],
    followUps: [],
    rubric: [],
    code: null,
    solution: null,
    jdRequirementTag: null,
    altSolutions: null,
  });
  const [candidate] = await db
    .insert(candidates)
    .values({ name: `Test Candidate ${randomUUID()}` })
    .returning();
  const [session] = await db
    .insert(interviewSessions)
    .values({ candidateId: candidate.id, templateId: template.id })
    .returning();
  return { session, question };
}

describe("recordDecisionAction", () => {
  it("returns field errors on invalid form input", async () => {
    const { session } = await createSessionFixture();

    const result = await recordDecisionAction(session.id, undefined, formData({ mode: "not-a-mode" }));

    expect(result?.error).toBeTruthy();
    expect(result?.fieldErrors?.mode).toBeTruthy();
  });

  it("§40.2: surfaces the plain-language 'needs a forced Pass/Fail call' message, not a raw enum dump", async () => {
    const { session, question } = await createSessionFixture();
    // Rate into the BORDERLINE band (template defaults: pass 70 / borderline 50).
    await rateQuestion(session.id, question.id, 3);

    const result = await recordDecisionAction(session.id, undefined, formData({ mode: "accept" }));

    expect(result?.error).toBe("This result needs a forced Pass/Fail call.");
  });

  it("records an accepted decision and revalidates on success", async () => {
    const { session, question } = await createSessionFixture();
    await rateQuestion(session.id, question.id, 5);

    const result = await recordDecisionAction(session.id, undefined, formData({ mode: "accept" }));

    expect(result?.error).toBeUndefined();
    expect(revalidatePath).toHaveBeenCalledWith(`/interviews/${session.id}/summary`);
    expect(revalidatePath).toHaveBeenCalledWith("/candidates");
  });
});

describe("finishRatingAction", () => {
  it("moves the session to completed and redirects to the summary screen", async () => {
    const { session } = await createSessionFixture();

    await finishRatingAction(session.id);

    const updated = await db.query.interviewSessions.findFirst({
      where: (t, { eq: eqOp }) => eqOp(t.id, session.id),
    });
    expect(updated?.status).toBe("completed");
    expect(redirect).toHaveBeenCalledWith(`/interviews/${session.id}/summary`);
  });
});

describe("reopenSessionAction", () => {
  it("§40.2: a not-yet-finished session gets the plain 'Only a finished interview can be reopened' error", async () => {
    const { session } = await createSessionFixture();

    await expect(reopenSessionAction(session.id)).rejects.toThrow(
      "Only a finished interview can be reopened."
    );
  });

  it("reopens a finished session and redirects back to the rating screen", async () => {
    const { session } = await createSessionFixture();
    await finishRatingAction(session.id);
    vi.mocked(redirect).mockClear();

    await reopenSessionAction(session.id);

    const updated = await db.query.interviewSessions.findFirst({
      where: (t, { eq: eqOp }) => eqOp(t.id, session.id),
    });
    expect(updated?.status).toBe("in_progress");
    expect(redirect).toHaveBeenCalledWith(`/interviews/${session.id}`);
  });
});
