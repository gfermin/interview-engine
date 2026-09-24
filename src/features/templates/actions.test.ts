// @vitest-environment node
//
// §40.5 item 5: templates/actions.ts had no Server Action-level coverage.
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { positions } from "@/db/schema";
import { createCompetency, createTemplate } from "./mutations";
import { createTemplateAction, publishTemplateAction, updateScoringConfigAction } from "./actions";

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

describe("createTemplateAction", () => {
  it("returns field errors on invalid input, without redirecting", async () => {
    const result = await createTemplateAction(undefined, formData({ stage: "not-a-stage" }));

    expect(result?.error).toBeTruthy();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("creates the template and redirects to its builder page on success", async () => {
    const [position] = await db
      .insert(positions)
      .values({ title: `Test Position ${randomUUID()}` })
      .returning();

    await createTemplateAction(
      undefined,
      formData({ positionId: position.id, stage: "technical", name: "Backend — Technical" })
    );

    expect(revalidatePath).toHaveBeenCalledWith("/templates");
    expect(redirect).toHaveBeenCalledWith(expect.stringMatching(/^\/templates\//));
  });
});

describe("publishTemplateAction", () => {
  it("returns a clean error when the template isn't publishable", async () => {
    const [position] = await db
      .insert(positions)
      .values({ title: `Test Position ${randomUUID()}` })
      .returning();
    const template = await createTemplate({ positionId: position.id, stage: "technical", name: "T" });
    // No competencies added — checkPublishable refuses.

    const result = await publishTemplateAction(template.id, undefined);

    expect(result?.error).toMatch(/competency/i);
  });

  it("publishes and revalidates on success", async () => {
    const [position] = await db
      .insert(positions)
      .values({ title: `Test Position ${randomUUID()}` })
      .returning();
    const template = await createTemplate({ positionId: position.id, stage: "technical", name: "T" });
    await createCompetency(template.id, { name: "x", weight: 100, critical: false, expectedDepth: null });

    const result = await publishTemplateAction(template.id, undefined);

    expect(result?.error).toBeUndefined();
    expect(revalidatePath).toHaveBeenCalledWith(`/templates/${template.id}`);
  });
});

describe("updateScoringConfigAction", () => {
  it("§40.2: a non-numeric submission surfaces the plain field message, not Zod's default wording", async () => {
    const [position] = await db
      .insert(positions)
      .values({ title: `Test Position ${randomUUID()}` })
      .returning();
    const template = await createTemplate({ positionId: position.id, stage: "technical", name: "T" });

    const result = await updateScoringConfigAction(
      template.id,
      undefined,
      formData({ passThreshold: "not-a-number", borderlineMin: "50", criticalMin: "50", minCompletion: "70" })
    );

    expect(result?.fieldErrors?.passThreshold?.[0]).toBe("Pass threshold must be a number.");
  });

  it("saves a valid configuration", async () => {
    const [position] = await db
      .insert(positions)
      .values({ title: `Test Position ${randomUUID()}` })
      .returning();
    const template = await createTemplate({ positionId: position.id, stage: "technical", name: "T" });

    const result = await updateScoringConfigAction(
      template.id,
      undefined,
      formData({ passThreshold: "80", borderlineMin: "60", criticalMin: "55", minCompletion: "75" })
    );

    expect(result?.error).toBeUndefined();
    const updated = await db.query.interviewTemplates.findFirst({
      where: (t, { eq }) => eq(t.id, template.id),
    });
    expect(updated?.passThreshold).toBe(80);
  });
});
