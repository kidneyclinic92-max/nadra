import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { toDateInputValue } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import { ExperienceManager } from "./experience-manager";

export const metadata: Metadata = { title: "Experience" };

export default async function ExperiencePage() {
  const user = await requireRole("CANDIDATE");

  const candidate = await prisma.candidate.findUnique({
    where: { userId: user.id },
    select: { experiences: { orderBy: { startDate: "desc" } } },
  });

  const experiences = (candidate?.experiences ?? []).map((e) => ({
    id: e.id,
    organization: e.organization,
    designation: e.designation,
    department: e.department,
    employmentType: e.employmentType,
    startDate: toDateInputValue(e.startDate),
    endDate: toDateInputValue(e.endDate),
    isCurrent: e.isCurrent,
    responsibilities: e.responsibilities,
  }));

  return (
    <>
      <PageHeader
        title="Work experience"
        description="Optional, but positions that require prior service are matched against these records."
      />
      <ExperienceManager experiences={experiences} />
    </>
  );
}
