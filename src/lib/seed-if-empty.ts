import type { PrismaClient } from "@/generated/prisma/client";
import { seedDemoPipeline } from "@/lib/demo-pipeline";

/**
 * Azure's SQLite is a different file from local `dev.db`. Register-created
 * accounts stay put; missing demo staff, posts, applicants and AI scores are
 * added once so the recruiter dashboard has something to rank.
 */
export async function seedIfEmpty(prisma: PrismaClient): Promise<void> {
  await seedDemoPipeline(prisma, { reset: false });
}
