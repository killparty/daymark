import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import * as schema from "./schema.ts";

const MIGRATIONS = fileURLToPath(new URL("../../../drizzle", import.meta.url));

/** Opens (or creates) the SQLite database and applies pending migrations. */
export function openDatabase(path: string) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const sqlite = new Database(path, { create: true, strict: true });
  sqlite.exec("PRAGMA journal_mode = WAL");
  sqlite.exec("PRAGMA foreign_keys = ON");
  sqlite.exec("PRAGMA busy_timeout = 5000");
  sqlite.exec("PRAGMA synchronous = NORMAL");
  const db = drizzle({ client: sqlite, schema });
  migrate(db, { migrationsFolder: MIGRATIONS });
  return db;
}

export type Db = ReturnType<typeof openDatabase>;
/** A database handle or an open transaction. */
export type DbLike = BaseSQLiteDatabase<"sync", unknown, typeof schema>;
