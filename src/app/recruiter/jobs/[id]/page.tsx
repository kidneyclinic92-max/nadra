import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import {
  APPLICATION_STATUSES,
  EDUCATION_LEVELS,
  JOB_STATUSES,
  PROVINCES,
  labelFor,
} from "@/lib/constants";
import { evaluateEligibility } from "@/lib/eligibility";
import { formatDate, formatDeadline } from "@/lib/format";
import { setJobStatusAction } from "@/lib/actions/jobs";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  DescriptionList,
  EmptyState,
  LinkButton,
  PageHeader,
  Stat,
  toneForJobStatus,
} from "@/components/ui";
import { ActionButton } from "@/components/action-button";
import { ApplicantTable } from "./applicant-table";
import { ApplicantFilters } from "./applicant-filters";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{
  status?: string;
  q?: string;
  domicile?: string;
  education?: string;
  minScore?: string;
  sort?: string;
}>;

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

export default async function JobApplicantsPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  await requireStaff();
  const { id } = await params;
  const filters = await searchParams;

  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) notFound();

  const minScore = Number(filters.minScore ?? "0") || 0;

  const applications = await prisma.application.findMany({
    where: {
      jobId: job.id,
      ...(filters.status ? { status: filters.status } : {}),
      ...(minScore > 0 ? { eligibilityScore: { gte: minScore } } : {}),
      candidate: {
        ...(filters.domicile ? { domicileProvince: filters.domicile } : {}),
        ...(filters.q
          ? {
              OR: [
                { fullName: { contains: filters.q } },
                { cnic: { contains: filters.q } },
              ],
            }
          : {}),
        ...(filters.education
          ? { educations: { some: { level: filters.education } } }
          : {}),
      },
    },
    orderBy:
      filters.sort === "recent"
        ? { appliedAt: "desc" }
        : filters.sort === "name"
          ? { candidate: { fullName: "asc" } }
          : [{ eligibilityScore: "desc" }, { appliedAt: "asc" }],
    include: {
      candidate: {
        include: { educations: true, experiences: true },
      },
    },
  });

  const statusCounts = await prisma.application.groupBy({
    by: ["status"],
    where: { jobId: job.id },
    _count: { _all: true },
  });

  const countFor = (status: string) =>
    statusCounts.find((s) => s.status === status)?._count._all ?? 0;
  const totalApplicants = statusCounts.reduce((sum, s) => sum + s._count._all, 0);

  // Re-evaluated per request so criteria edits are reflected without needing to
  // rescore every stored application.
  const rows = applications.map((application) => {
    const result = evaluateEligibility(application.candidate, job);
    return {
      id: application.id,
      status: application.status,
      appliedAt: formatDate(application.appliedAt),
      recruiterNotes: application.recruiterNotes,
      score: result.score,
      meetsAll: result.meetsAll,
      failedCriteria: result.checks.filter((c) => !c.passed).map((c) => c.label),
      candidate: {
        id: application.candidate.id,
        fullName: application.candidate.fullName,
        cnic: application.candidate.cnic,
        city: application.candidate.city,
        domicileProvince: application.candidate.domicileProvince
          ? labelFor(PROVINCES, application.candidate.domicileProvince)
          : null,
        quotaCategory: application.candidate.quotaCategory,
        mobile: application.candidate.mobile,
      },
    };
  });

  const location = [job.city, job.province ? labelFor(PROVINCES, job.province) : null]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <PageHeader
        title={job.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs">{job.code}</span>
            <Badge tone={toneForJobStatus(job.status)}>
              {labelFor(JOB_STATUSES, job.status)}
            </Badge>
            <span className="text-slate-500">{formatDeadline(job.closingDate)}</span>
          </span>
        }
        action={
          <div className="flex flex-wrap gap-2">
            {job.status !== "OPEN" ? (
              <ActionButton
                action={setJobStatusAction}
                fields={{ jobId: job.id, status: "OPEN" }}
                size="sm"
                pendingLabel="Publishing…"
              >
                Publish
              </ActionButton>
            ) : (
              <ActionButton
                action={setJobStatusAction}
                fields={{ jobId: job.id, status: "CLOSED" }}
                variant="secondary"
                size="sm"
                confirm="Close this position to new applications?"
                pendingLabel="Closing…"
              >
                Close position
              </ActionButton>
            )}
            <LinkButton
              href={`/recruiter/jobs/${job.id}/edit`}
              variant="secondary"
              size="sm"
            >
              Edit
            </LinkButton>
            <LinkButton href={`/jobs/${job.id}`} variant="ghost" size="sm">
              Public view
            </LinkButton>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Applicants" value={totalApplicants} />
        <Stat label="Under review" value={countFor("UNDER_REVIEW")} tone="warning" />
        <Stat label="Shortlisted" value={countFor("SHORTLISTED")} tone="success" />
        <Stat label="Rejected" value={countFor("REJECTED")} tone="danger" />
      </div>

      <div className="mb-6">
        <Card>
          <CardHeader
            title="Eligibility criteria"
            description="Applicants are scored against these requirements."
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
                  value: job.requiredDegreeTitle ?? "Any",
                },
                {
                  label: "Experience",
                  value:
                    job.minExperienceYears > 0
                      ? `${job.minExperienceYears}+ years`
                      : "Not required",
                },
                {
                  label: "Age limit",
                  value:
                    job.minAge || job.maxAge
                      ? `${job.minAge ?? "—"} to ${job.maxAge ?? "—"}`
                      : "None",
                },
                {
                  label: "Domicile",
                  value:
                    job.domicileRestriction === "ANY"
                      ? "All provinces"
                      : labelFor(PROVINCES, job.domicileRestriction),
                },
                { label: "Location", value: location || "—" },
              ]}
            />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Applicants"
          description={`${rows.length} shown of ${totalApplicants} total`}
        />
        <CardBody className="border-b border-slate-200 bg-slate-50">
          <ApplicantFilters jobId={job.id} current={filters} />
        </CardBody>

        {rows.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title={
                totalApplicants === 0
                  ? "No applications yet"
                  : "No applicants match these filters"
              }
              description={
                totalApplicants === 0
                  ? "Applicants will appear here once candidates apply."
                  : "Try relaxing the filters to see more candidates."
              }
            />
          </div>
        ) : (
          <ApplicantTable rows={rows} />
        )}
      </Card>

      {rows.length > 0 ? (
        <p className="mt-4 text-xs text-slate-500">
          Criteria matching is advisory. Review each candidate&apos;s documents
          before making a final decision — see{" "}
          <Link
            href="/recruiter/candidates"
            className="font-medium text-teal-700 hover:underline"
          >
            the candidate database
          </Link>{" "}
          for full profiles.
        </p>
      ) : null}
    </>
  );
}

export const dynamic = "force-dynamic";
