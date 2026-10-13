import { createHash, randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3") as {
  new (
    filename: string,
    options?: { timeout?: number },
  ): {
    exec: (sql: string) => unknown;
    prepare: (sql: string) => {
      all: (...params: unknown[]) => Array<{ migration_name: string }>;
      run: (...params: unknown[]) => unknown;
    };
    close: () => void;
  };
};

function sqliteFilePath(url: string): string | null {
  if (!url.startsWith("file:")) return null;
  return path.resolve(
    /*turbopackIgnore: true*/ process.cwd(),
    url.slice("file:".length),
  );
}

function findMigrationsDir(): string | null {
  const candidates = [
    path.join(/*turbopackIgnore: true*/ process.cwd(), "prisma", "migrations"),
    path.join(
      /*turbopackIgnore: true*/ process.cwd(),
      "..",
      "prisma",
      "migrations",
    ),
  ];
  return (
    candidates.find((dir) => existsSync(/*turbopackIgnore: true*/ dir)) ?? null
  );
}

/**
 * Applies Prisma SQL migrations with better-sqlite3 so Azure does not have to
 * run `npx prisma` (or wait on Azure Files) before Next can bind PORT.
 */
export function applySqliteMigrations(databaseUrl: string): void {
  const dbFile = sqliteFilePath(databaseUrl);
  if (!dbFile) return;

  mkdirSync(/*turbopackIgnore: true*/ path.dirname(dbFile), {
    recursive: true,
  });

  const migrationsDir = findMigrationsDir();
  if (!migrationsDir) {
    console.error("prisma/migrations not found; skipping SQLite migrate");
    return;
  }

  const db = new Database(dbFile, { timeout: 5000 });
  try {
    const journalMode = process.env.WEBSITE_SITE_NAME ? "DELETE" : "WAL";
    db.exec(`PRAGMA journal_mode = ${journalMode};`);
    db.exec("PRAGMA busy_timeout = 5000;");
    db.exec("PRAGMA foreign_keys = ON;");
    db.exec(`
      CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "checksum" TEXT NOT NULL,
        "finished_at" DATETIME,
        "migration_name" TEXT NOT NULL,
        "logs" TEXT,
        "rolled_back_at" DATETIME,
        "started_at" DATETIME NOT NULL DEFAULT current_timestamp,
        "applied_steps_count" INTEGER UNSIGNED NOT NULL DEFAULT 0
      );
    `);

    const applied = new Set(
      db
        .prepare(
          `SELECT migration_name FROM "_prisma_migrations" WHERE rolled_back_at IS NULL`,
        )
        .all()
        .map((row) => row.migration_name),
    );

    const dirs = readdirSync(/*turbopackIgnore: true*/ migrationsDir, {
      withFileTypes: true,
    })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();

    const insert = db.prepare(`
      INSERT INTO "_prisma_migrations"
        (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
      VALUES (?, ?, ?, ?, NULL, NULL, ?, 1)
    `);

    for (const name of dirs) {
      if (applied.has(name)) continue;
      const sqlPath = path.join(migrationsDir, name, "migration.sql");
      if (!existsSync(/*turbopackIgnore: true*/ sqlPath)) continue;

      const sql = readFileSync(/*turbopackIgnore: true*/ sqlPath, "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      const startedAt = new Date().toISOString();

      db.exec("BEGIN");
      try {
        if (sql.trim()) db.exec(sql);
        insert.run(randomUUID(), checksum, startedAt, name, startedAt);
        db.exec("COMMIT");
        console.log(`Applied SQLite migration ${name}`);
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    }
  } finally {
    db.close();
  }
}
