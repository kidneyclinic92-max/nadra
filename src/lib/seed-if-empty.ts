import bcrypt from "bcryptjs";
import type { PrismaClient } from "@/generated/prisma/client";

const DEMO_PASSWORD = "Password123!";
const ADMIN_EMAIL = "admin@recruitment.gov.pk";
const RECRUITER_EMAIL = "recruiter@recruitment.gov.pk";

/**
 * Azure's SQLite is a different file from local `dev.db`. Accounts created
 * via Register exist there; the seeded recruiter does not unless we add it.
 */
export async function seedIfEmpty(prisma: PrismaClient): Promise<void> {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  if (!(await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } }))) {
    await prisma.user.create({
      data: { email: ADMIN_EMAIL, passwordHash, role: "ADMIN" },
    });
  }

  let recruiter = await prisma.user.findUnique({
    where: { email: RECRUITER_EMAIL },
  });
  if (!recruiter) {
    recruiter = await prisma.user.create({
      data: { email: RECRUITER_EMAIL, passwordHash, role: "RECRUITER" },
    });
  }

  if ((await prisma.job.count()) === 0) {
    await prisma.job.create({
      data: {
        code: "IT/2026/001",
        title: "Assistant Director (Information Technology)",
        department: "Information Technology",
        description:
          "Lead in-house application development and departmental reporting.",
        city: "Lahore",
        province: "PUNJAB",
        positions: 2,
        payScale: "BPS-17",
        minEducationLevel: "BACHELORS",
        status: "OPEN",
        closingDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        createdById: recruiter.id,
      },
    });
  }
}
