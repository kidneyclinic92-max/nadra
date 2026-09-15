import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";

function createClient() {
  const adapter = new PrismaBetterSqlite3({ url: databaseUrl });
  const client = new PrismaClient({ adapter });

  // WAL lets readers continue while a write is in flight, which is what keeps
  // SQLite usable during an application deadline rush. busy_timeout makes
  // concurrent writers wait for the lock instead of failing immediately.
  void client
    .$queryRawUnsafe("PRAGMA journal_mode = WAL;")
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

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
