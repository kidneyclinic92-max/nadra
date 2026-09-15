import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { toDateInputValue } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import { JobForm, type JobFormDefaults } from "../../job-form";

export const metadata: Metadata = { title: "Edit position" };

type Params = Promise<{ id: string }>;

export default async function EditJobPage({ params }: { params: Params }) {
  await requireStaff();
  const { id } = await params;

  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) notFound();

  const defaults: JobFormDefaults = {
    id: job.id,
    code: job.code,
    title: job.title,
    department: job.department ?? "",
    description: job.description,
    responsibilities: job.responsibilities ?? "",
    city: job.city ?? "",
    province: job.province ?? "",
    employmentType: job.employmentType,
    positions: String(job.positions),
    payScale: job.payScale ?? "",
    minEducationLevel: job.minEducationLevel ?? "",
    requiredDegreeTitle: job.requiredDegreeTitle ?? "",
    minExperienceYears: String(job.minExperienceYears),
    minAge: job.minAge != null ? String(job.minAge) : "",
    maxAge: job.maxAge != null ? String(job.maxAge) : "",
    genderRequirement: job.genderRequirement,
    domicileRestriction: job.domicileRestriction,
    requiredSkills: job.requiredSkills ?? "",
    status: job.status,
    closingDate: toDateInputValue(job.closingDate),
  };

  return (
    <>
      <PageHeader title="Edit position" description={job.title} />
      <JobForm defaults={defaults} />
    </>
  );
}
