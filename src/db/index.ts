import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const DEFAULT_DB_PATH = "./.data/dev.sqlite";
const dbPath = process.env.DATABASE_URL ?? DEFAULT_DB_PATH;

mkdirSync(dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
// Plan Phase 31/AUDIT-017 — without this, a connection that finds the file
// locked (e.g. another process/worker mid-transaction against the same
// SQLite file, as the test suite's parallel workers do) fails immediately
// with SQLITE_BUSY instead of retrying for a bit. Harmless for the app's
// real single-process usage; only ever matters when something else is
// briefly holding the write lock.
sqlite.pragma("busy_timeout = 5000");

export const db = drizzle(sqlite, { schema });
