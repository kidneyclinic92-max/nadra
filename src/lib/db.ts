import { mkdirSync } from "node:fs";
import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";
import { applySqliteMigrations } from "@/lib/sqlite-migrate";
import { seedIfEmpty } from "@/lib/seed-if-empty";

if (process.env.WEBSITE_SITE_NAME) {
  process.env.DATABASE_URL ??= "file:/home/data/nadra.db";
  process.env.UPLOAD_DIR ??= "/home/data/uploads";
}

const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";

function ensureDataDirs() {
  if (databaseUrl.startsWith("file:")) {
    const dbFile = path.resolve(
      /*turbopackIgnore: true*/ process.cwd(),
      databaseUrl.slice("file:".length),
    );
    mkdirSync(/*turbopackIgnore: true*/ path.dirname(dbFile), {
      recursive: true,
    });
  }
  if (process.env.UPLOAD_DIR) {
    mkdirSync(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR, {
      recursive: true,
    });
  }
}

function createClient() {
  ensureDataDirs();
  applySqliteMigrations(databaseUrl);

  const adapter = new PrismaBetterSqlite3({ url: databaseUrl });
  const client = new PrismaClient({ adapter });
  void seedIfEmpty(client).catch((error) => {
    console.error("Failed to ensure demo staff accounts", error);
  });

  // WAL is right for local disk. Azure App Service mounts /home as Azure Files,
  // which does not support WAL and surfaces as 503s / disk I/O errors.
  const journalMode = process.env.WEBSITE_SITE_NAME ? "DELETE" : "WAL";
  void client
    .$queryRawUnsafe(`PRAGMA journal_mode = ${journalMode};`)
    .then(() => client.$queryRawUnsafe("PRAGMA busy_timeout = 5000;"))
    .then(() => client.$queryRawUnsafe("PRAGMA foreign_keys = ON;"))
    .catch((error) => {
      console.error("Failed to apply SQLite pragmas", error);
    });

  return client;
}

// Next.js hot reloading would otherwise open a new connection on every edit.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createClient();
  }
  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    const client = getClient();
    const value = Reflect.get(client, property, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export async function safeQuery<T>(
  query: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await query();
  } catch (error) {
    console.error("Database query failed", error);
    return fallback;
  }
}
