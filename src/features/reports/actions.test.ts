// @vitest-environment node
//
// §40.5 item 5: reports/actions.ts had no test coverage. This suite also
// exercises §40.2's Playwright-missing-binary fix (render.ts's
// launchChromium) end to end through the action layer, since that's where
// the friendly message actually needs to reach the interviewer.
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { candidates, interviewSessions, positions } from "@/db/schema";
import { createCompetency, createTemplate, publishTemplate } from "@/features/templates/mutations";
import { rateQuestion, recordDecision } from "@/features/interviews/mutations";
import { createQuestion } from "@/features/templates/mutations";
import { generateReportAction } from "./actions";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const launchMock = vi.hoisted(() => vi.fn());
vi.mock("playwright", () => ({ chromium: { launch: launchMock } }));

beforeEach(() => {
  vi.mocked(revalidatePath).mockClear();
  launchMock.mockReset();
});

async function createDecidedSession() {
  const [position] = await db
    .insert(positions)
    .values({ title: `Test Position ${randomUUID()}` })
    .returning();
  const template = await createTemplate({ positionId: position.id, stage: "technical", name: "T" });
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
  await publishTemplate(template.id);
  const [candidate] = await db
    .insert(candidates)
    .values({ name: `Test Candidate ${randomUUID()}` })
    .returning();
  const [session] = await db
    .insert(interviewSessions)
    .values({ candidateId: candidate.id, templateId: template.id })
    .returning();
  await rateQuestion(session.id, question.id, 5);
  await recordDecision(session.id, { mode: "accept" });
  return session;
}

describe("generateReportAction", () => {
  it("returns an error, not a thrown exception, when the session has no decision yet", async () => {
    const [position] = await db
      .insert(positions)
      .values({ title: `Test Position ${randomUUID()}` })
      .returning();
    const template = await createTemplate({ positionId: position.id, stage: "technical", name: "T" });
    await createCompetency(template.id, { name: "x", weight: 100, critical: false, expectedDepth: null });
    await publishTemplate(template.id);
    const [candidate] = await db
      .insert(candidates)
      .values({ name: `Test Candidate ${randomUUID()}` })
      .returning();
    const [session] = await db
      .insert(interviewSessions)
      .values({ candidateId: candidate.id, templateId: template.id })
      .returning();

    const result = await generateReportAction(session.id, undefined);

    expect(result?.error).toMatch(/recorded decision/);
  });

  it("§40.2: maps Playwright's raw 'Executable doesn't exist' error to the README's install instruction", async () => {
    launchMock.mockRejectedValueOnce(
      new Error(
        "browserType.launch: Executable doesn't exist at /home/user/.cache/ms-playwright/chromium-1234/chrome-linux/chrome"
      )
    );
    const session = await createDecidedSession();

    const result = await generateReportAction(session.id, undefined);

    expect(result?.error).toBe("PDF engine not installed — run `npx playwright install chromium` and try again.");
  });

  it("succeeds and revalidates the summary path when Chromium launches fine", async () => {
    launchMock.mockResolvedValueOnce({
      newPage: vi.fn().mockResolvedValue({
        setContent: vi.fn().mockResolvedValue(undefined),
        pdf: vi.fn().mockResolvedValue(Buffer.from("%PDF-1.4 fake")),
      }),
      close: vi.fn().mockResolvedValue(undefined),
    });
    const session = await createDecidedSession();

    const result = await generateReportAction(session.id, undefined);

    expect(result?.error).toBeUndefined();
    expect(revalidatePath).toHaveBeenCalledWith(`/interviews/${session.id}/summary`);
  });
});
