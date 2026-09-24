import "@testing-library/jest-dom/vitest";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

// Any test that imports the src/db singleton (feature-layer tests, not the
// isolated-temp-db tests under src/db/*.test.ts) needs a migrated schema at
// DATABASE_URL first. drizzle's migrator tracks applied migrations, so
// running this on every test file is a cheap no-op after the first time.
const dbPath = process.env.DATABASE_URL ?? "./.data/test.sqlite";
mkdirSync(dirname(dbPath), { recursive: true });
const sqlite = new Database(dbPath);
migrate(drizzle(sqlite), { migrationsFolder: "./drizzle" });
sqlite.close();
