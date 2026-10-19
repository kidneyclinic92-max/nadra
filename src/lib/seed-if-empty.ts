import bcrypt from "bcryptjs";
import type { PrismaClient } from "@/generated/prisma/client";

const DEMO_PASSWORD = "Password123!";

/**
 * Azure starts with an empty SQLite file. Without this, demo logins 404 as
 * "incorrect password" even after the site boots.
 */
export async function seedIfEmpty(prisma: PrismaClient): Promise<void> {
  const existing = await prisma.user.count();
  if (existing > 0) return;

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const closingDate = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    await tx.user.create({
      data: {
        email: "admin@recruitment.gov.pk",
        passwordHash,
        role: "ADMIN",
      },
    });
    const recruiter = await tx.user.create({
      data: {
        email: "recruiter@recruitment.gov.pk",
        passwordHash,
        role: "RECRUITER",
      },
    });
    await tx.user.create({
      data: {
        email: "ayesha.khan@example.com",
        passwordHash,
        role: "CANDIDATE",
        candidate: {
          create: {
            fullName: "Ayesha Khan",
            guardianName: "Imran Khan",
            cnic: "35202-1234567-1",
            mobile: "03001234567",
            city: "Lahore",
            province: "PUNJAB",
          },
        },
      },
    });
    await tx.job.create({
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
        closingDate,
        createdById: recruiter.id,
      },
    });
  });

  console.log(
    "Seeded empty database with demo accounts (password Password123!)",
  );
}
