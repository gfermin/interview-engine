import { describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { db } from "./index";

// Phase 1 smoke test: proves the SQLite/Drizzle connection wiring works
// end-to-end, ahead of any real schema (added in Phase 2).
describe("db connection", () => {
  it("connects to SQLite and can run a query", () => {
    const result = db.get<{ value: number }>(sql`SELECT 1 as value`);
    expect(result).toEqual({ value: 1 });
  });
});
