import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { JOB_STATUSES, labelFor } from "@/lib/constants";
import { formatDeadline } from "@/lib/format";
import {
  Badge,
  Card,
  EmptyState,
  LinkButton,
  PageHeader,
  toneForJobStatus,
} from "@/components/ui";

export const metadata: Metadata = { title: "Positions" };

type SearchParams = Promise<{ status?: string }>;

export default async function RecruiterJobsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireStaff();
  const { status = "" } = await searchParams;

  const jobs = await prisma.job.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { applications: true } },
      applications: {
        where: { status: "SHORTLISTED" },
        select: { id: true },
      },
    },
  });

  const filters = [{ value: "", label: "All" }, ...JOB_STATUSES];

  return (
    <>
      <PageHeader
        title="Positions"
        description="Create advertisements and review who has applied."
        action={<LinkButton href="/recruiter/jobs/new">Post a position</LinkButton>}
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {filters.map((filter) => {
          const isActive = status === filter.value;
          return (
            <Link
              key={filter.label}
              href={
                filter.value
                  ? `/recruiter/jobs?status=${filter.value}`
                  : "/recruiter/jobs"
              }
              className={
                isActive
                  ? "rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white"
                  : "rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              }
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      {jobs.length === 0 ? (
        <EmptyState
          title="No positions here"
          description="Create your first advertisement to start receiving applications."
          action={
            <LinkButton href="/recruiter/jobs/new">Post a position</LinkButton>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {jobs.map((job) => (
            <Card key={job.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/recruiter/jobs/${job.id}`}
                      className="text-sm font-semibold text-slate-900 hover:text-teal-700"
                    >
                      {job.title}
                    </Link>
                    <Badge tone={toneForJobStatus(job.status)}>
                      {labelFor(JOB_STATUSES, job.status)}
                    </Badge>
                  </div>
                  <p className="mt-1 font-mono text-xs text-slate-500">
                    {job.code}
                    {job.department ? ` · ${job.department}` : ""}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {job.positions} position{job.positions === 1 ? "" : "s"} ·{" "}
                    {formatDeadline(job.closingDate)}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Applicants</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {job._count.applications}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Shortlisted</p>
                    <p className="text-lg font-semibold text-emerald-700">
                      {job.applications.length}
                    </p>
                  </div>
                  <LinkButton
                    href={`/recruiter/jobs/${job.id}`}
                    variant="secondary"
                    size="sm"
                  >
                    Review
                  </LinkButton>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
