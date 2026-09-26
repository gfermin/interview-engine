// @vitest-environment node
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { candidates } from "@/db/schema";
import { listCandidates } from "./queries";

async function createCandidateFixture(archivedAt: Date | null = null) {
  const [candidate] = await db
    .insert(candidates)
    .values({ name: `Candidate ${randomUUID()}`, archivedAt })
    .returning();
  return candidate;
}

// Plan Phase 23/§44.9 — archived candidates must never clutter the default
// list or Dashboard, but must remain reachable via an explicit filter.
describe("listCandidates archived filter", () => {
  it("defaults to excluding archived candidates", async () => {
    const active = await createCandidateFixture();
    const archived = await createCandidateFixture(new Date());

    const ids = (await listCandidates()).map((c) => c.id);

    expect(ids).toContain(active.id);
    expect(ids).not.toContain(archived.id);
  });

  it('archived: "archived" returns only archived candidates', async () => {
    const active = await createCandidateFixture();
    const archived = await createCandidateFixture(new Date());

    const ids = (await listCandidates({ archived: "archived" })).map((c) => c.id);

    expect(ids).toContain(archived.id);
    expect(ids).not.toContain(active.id);
  });

  it('archived: "all" returns both', async () => {
    const active = await createCandidateFixture();
    const archived = await createCandidateFixture(new Date());

    const ids = (await listCandidates({ archived: "all" })).map((c) => c.id);

    expect(ids).toContain(active.id);
    expect(ids).toContain(archived.id);
  });
});
