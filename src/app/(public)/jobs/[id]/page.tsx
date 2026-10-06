import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  EDUCATION_LEVELS,
  EMPLOYMENT_TYPES,
  GENDER_REQUIREMENTS,
  PROVINCES,
  labelFor,
} from "@/lib/constants";
import { evaluateEligibility } from "@/lib/eligibility";
import { formatDate, formatDeadline, isDeadlinePassed } from "@/lib/format";
import {
  Alert,
  Badge,
  Card,
  CardBody,
  CardHeader,
  DescriptionList,
  LinkButton,
  PageHeader,
} from "@/components/ui";
import { ApplyPanel } from "./apply-panel";

type Params = Promise<{ id: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const job = await prisma.job.findUnique({
    where: { id },
    select: { title: true },
  });
  return { title: job?.title ?? "Position" };
}

export default async function JobDetailPage({ params }: { params: Params }) {
  const { id } = await params;

  const job = await prisma.job.findUnique({ where: { id } });
  if (!job || job.status === "DRAFT") notFound();

  const user = await getCurrentUser();

  const candidate =
    user?.role === "CANDIDATE"
      ? await prisma.candidate.findUnique({
          where: { userId: user.id },
          include: { educations: true, experiences: true },
        })
      : null;

  const existingApplication = candidate
    ? await prisma.application.findUnique({
        where: { jobId_candidateId: { jobId: job.id, candidateId: candidate.id } },
        select: { id: true, status: true, appliedAt: true },
      })
    : null;

  const eligibility = candidate ? evaluateEligibility(candidate, job) : null;

  const isClosed = job.status === "CLOSED" || isDeadlinePassed(job.closingDate);

  const location = [job.city, job.province ? labelFor(PROVINCES, job.province) : null]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <PageHeader
        title={job.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs">{job.code}</span>
            {job.department ? <span>· {job.department}</span> : null}
            <Badge tone={isClosed ? "danger" : "success"}>
              {isClosed ? "Closed" : formatDeadline(job.closingDate)}
            </Badge>
          </span>
        }
        action={
          <LinkButton href="/jobs" variant="secondary">
            All positions
          </LinkButton>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader title="About this position" />
            <CardBody className="flex flex-col gap-6">
              <p className="text-sm leading-relaxed whitespace-pre-line text-slate-700">
                {job.description}
              </p>

              {job.responsibilities ? (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-slate-900">
                    Key responsibilities
                  </h3>
                  <p className="text-sm leading-relaxed whitespace-pre-line text-slate-700">
                    {job.responsibilities}
                  </p>
                </div>
              ) : null}

              <div className="border-t border-slate-200 pt-5">
                <DescriptionList
                  items={[
                    { label: "Positions available", value: String(job.positions) },
                    {
                      label: "Employment type",
                      value: labelFor(EMPLOYMENT_TYPES, job.employmentType),
                    },
                    { label: "Location", value: location || "—" },
                    { label: "Pay scale", value: job.payScale ?? "—" },
                    { label: "Advertised on", value: formatDate(job.openingDate) },
                    {
                      label: "Closing date",
                      value: job.closingDate ? formatDate(job.closingDate) : "Open until filled",
                    },
                  ]}
                />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Eligibility criteria"
              description="Applications are shortlisted against these requirements."
            />
            <CardBody>
              <DescriptionList
                items={[
                  {
                    label: "Minimum qualification",
                    value: job.minEducationLevel
                      ? labelFor(EDUCATION_LEVELS, job.minEducationLevel)
                      : "Not specified",
                  },
                  {
                    label: "Field of study",
                    value: job.requiredDegreeTitle ?? "Any discipline",
                  },
                  {
                    label: "Experience",
                    value:
                      job.minExperienceYears > 0
                        ? `${job.minExperienceYears}+ years`
                        : "Fresh candidates may apply",
                  },
                  {
                    label: "Age limit",
                    value:
                      job.minAge || job.maxAge
                        ? `${job.minAge ?? "—"} to ${job.maxAge ?? "—"} years`
                        : "No age limit",
                  },
                  {
                    label: "Gender",
                    value: labelFor(GENDER_REQUIREMENTS, job.genderRequirement),
                  },
                  {
                    label: "Domicile",
                    value:
                      job.domicileRestriction === "ANY"
                        ? "All provinces"
                        : labelFor(PROVINCES, job.domicileRestriction),
                  },
                ]}
              />

              {job.requiredSkills ? (
                <div className="mt-6">
                  <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                    Required skills
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {job.requiredSkills.split(",").map((skill) => (
                      <Badge key={skill} tone="info">
                        {skill.trim()}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardBody>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-6">
            {isClosed ? (
              <Alert tone="warning" title="Applications are closed">
                This position stopped accepting applications on{" "}
                {formatDate(job.closingDate)}.
              </Alert>
            ) : (
              <ApplyPanel
                jobId={job.id}
                isSignedIn={Boolean(user)}
                isCandidate={user?.role === "CANDIDATE"}
                isProfileComplete={candidate?.isProfileComplete ?? false}
                existingApplication={existingApplication}
                eligibility={eligibility}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
