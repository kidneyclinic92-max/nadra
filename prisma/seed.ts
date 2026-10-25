/**
 * Development seed. Wipes the local database, then loads the demo pipeline.
 *
 * Run with: npm run db:seed
 */
import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { DEMO_PASSWORD, seedDemoPipeline } from "../src/lib/demo-pipeline";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  }),
});

seedDemoPipeline(prisma, { reset: true })
  .then(() => {
    console.log("\nDemo sign-in details (development only):");
    console.log(`  Admin      admin@recruitment.gov.pk      / ${DEMO_PASSWORD}`);
    console.log(`  Recruiter  recruiter@recruitment.gov.pk  / ${DEMO_PASSWORD}`);
    console.log(`  Candidate  ayesha.khan@example.com       / ${DEMO_PASSWORD}`);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
