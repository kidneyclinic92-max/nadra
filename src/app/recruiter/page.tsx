import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { APPLICATION_STATUSES, labelFor } from "@/lib/constants";
import { formatDate, formatDeadline } from "@/lib/format";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  LinkButton,
  PageHeader,
  Stat,
  toneForApplicationStatus,
} from "@/components/ui";

export const metadata: Metadata = { title: "Recruiter overview" };

export default async function RecruiterOverviewPage() {
  await requireStaff();

  const [openJobs, totalCandidates, statusCounts, recentApplications, closingSoon] =
    await Promise.all([
      prisma.job.count({ where: { status: "OPEN" } }),
      prisma.candidate.count(),
      prisma.application.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.application.findMany({
        orderBy: { appliedAt: "desc" },
        take: 8,
        include: {
          job: { select: { id: true, title: true, code: true } },
          candidate: { select: { id: true, fullName: true, cnic: true } },
        },
      }),
      prisma.job.findMany({
        where: { status: "OPEN", closingDate: { not: null } },
        orderBy: { closingDate: "asc" },
        take: 5,
      }),
    ]);

  const countFor = (status: string) =>
    statusCounts.find((s) => s.status === status)?._count._all ?? 0;

  const totalApplications = statusCounts.reduce(
    (sum, s) => sum + s._count._all,
    0,
  );

  return (
    <>
      <PageHeader
        title="Overview"
        description="Hiring activity across every advertised position."
        action={<LinkButton href="/recruiter/jobs/new">Post a position</LinkButton>}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Open positions" value={openJobs} tone="info" />
        <Stat label="Registered candidates" value={totalCandidates} />
        <Stat label="Applications" value={totalApplications} />
        <Stat
          label="Shortlisted"
          value={countFor("SHORTLISTED")}
          tone="success"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent applications"
            description="Newest submissions across all positions."
          />
          {recentApplications.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="No applications yet"
                description="Applications will appear here as candidates apply to your open positions."
              />
            </div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {recentApplications.map((application) => (
                <li
                  key={application.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/recruiter/candidates/${application.candidate.id}`}
                      className="text-sm font-medium text-slate-900 hover:text-teal-700"
                    >
                      {application.candidate.fullName}
                    </Link>
                    <p className="truncate text-xs text-slate-500">
                      {application.job.title} · {application.job.code} ·{" "}
                      {formatDate(application.appliedAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs font-medium text-slate-500">
                      {application.eligibilityScore}%
                    </span>
                    <Badge tone={toneForApplicationStatus(application.status)}>
                      {labelFor(APPLICATION_STATUSES, application.status)}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Closing soon" />
          {closingSoon.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-500">
              No positions have a closing date set.
            </p>
          ) : (
            <ul className="divide-y divide-slate-200">
              {closingSoon.map((job) => (
                <li key={job.id} className="px-5 py-3">
                  <Link
                    href={`/recruiter/jobs/${job.id}`}
                    className="text-sm font-medium text-slate-900 hover:text-teal-700"
                  >
                    {job.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {formatDeadline(job.closingDate)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
