import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { EducationManager } from "./education-manager";

export const metadata: Metadata = { title: "Education" };

export default async function EducationPage() {
  const user = await requireRole("CANDIDATE");

  const candidate = await prisma.candidate.findUnique({
    where: { userId: user.id },
    select: {
      educations: {
        orderBy: [{ passingYear: "desc" }],
      },
    },
  });

  const educations = (candidate?.educations ?? []).map((e) => ({
    ...e,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  }));

  return (
    <>
      <PageHeader
        title="Education"
        description="Add every qualification you want considered, starting with your highest."
      />
      <EducationManager educations={educations} />
    </>
  );
}
