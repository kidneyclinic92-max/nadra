import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { formatDeadline } from "@/lib/format";
import {
  Badge,
  Card,
  CardHeader,
  EmptyState,
  LinkButton,
  PageHeader,
  Stat,
} from "@/components/ui";

export const metadata: Metadata = { title: "Recruiter overview" };

export default async function RecruiterOverviewPage() {
  await requireStaff();

  const [openJobs, totalCandidates, statusCounts, jobs] = await Promise.all([
    prisma.job.count({ where: { status: "OPEN" } }),
    prisma.candidate.count(),
    prisma.application.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.job.findMany({
      where: { status: "OPEN" },
      orderBy: [{ closingDate: "asc" }, { createdAt: "desc" }],
      include: {
        applications: {
          where: { status: { not: "WITHDRAWN" } },
          select: {
            status: true,
            screening: {
              select: {
                status: true,
                matchScore: true,
                recommendation: true,
              },
            },
            candidate: { select: { fullName: true } },
          },
        },
      },
    }),
  ]);

  const countFor = (status: string) =>
    statusCounts.find((s) => s.status === status)?._count._all ?? 0;

  const totalApplications = statusCounts.reduce(
    (sum, s) => sum + s._count._all,
    0,
  );

  const pipeline = jobs.map((job) => {
    const applicants = job.applications;
    const screened = applicants.filter(
      (application) => application.screening?.status === "COMPLETED",
    );
    const unscreened = applicants.length - screened.length;
    const strong = screened.filter(
      (application) => (application.screening?.matchScore ?? 0) >= 80,
    );
    const pendingShortlist = strong.filter(
      (application) => application.status !== "SHORTLISTED",
    );
    const shortlisted = applicants.filter(
      (application) => application.status === "SHORTLISTED",
    ).length;
    const top = [...screened]
      .sort(
        (a, b) =>
          (b.screening?.matchScore ?? 0) - (a.screening?.matchScore ?? 0),
      )
      .slice(0, 3);

    return {
      id: job.id,
      title: job.title,
      code: job.code,
      closing: formatDeadline(job.closingDate),
      applicants: applicants.length,
      unscreened,
      screened: screened.length,
      strong: strong.length,
      pendingShortlist: pendingShortlist.length,
      shortlisted,
      top: top.map((application) => ({
        name: application.candidate.fullName,
        score: application.screening?.matchScore ?? 0,
      })),
    };
  });

  return (
    <>
      <PageHeader
        title="Overview"
        description="Screen every applicant against the published criteria, then shortlist the strongest resume matches."
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

      <Card>
        <CardHeader
          title="Screen and shortlist"
          description="Each open post: run AI across all applicants, then shortlist the top matches."
        />
        {pipeline.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="No open positions"
              description="Publish a position to start receiving applications."
              action={
                <LinkButton href="/recruiter/jobs/new">Post a position</LinkButton>
              }
            />
          </div>
        ) : (
          <ul className="divide-y divide-slate-200">
            {pipeline.map((job) => (
              <li
                key={job.id}
                className="flex flex-wrap items-start justify-between gap-4 px-5 py-4"
              >
                <div className="min-w-0">
                  <Link
                    href={`/recruiter/jobs/${job.id}`}
                    className="text-sm font-semibold text-slate-900 hover:text-teal-700"
                  >
                    {job.title}
                  </Link>
                  <p className="mt-0.5 font-mono text-xs text-slate-500">
                    {job.code} · {job.closing}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge tone="neutral">{job.applicants} applicants</Badge>
                    {job.unscreened > 0 ? (
                      <Badge tone="warning">{job.unscreened} not screened</Badge>
                    ) : job.applicants > 0 ? (
                      <Badge tone="success">All screened</Badge>
                    ) : null}
                    {job.strong > 0 ? (
                      <Badge tone="success">{job.strong} strong matches</Badge>
                    ) : null}
                    {job.shortlisted > 0 ? (
                      <Badge tone="info">{job.shortlisted} shortlisted</Badge>
                    ) : null}
                  </div>
                  {job.top.length > 0 ? (
                    <ol className="mt-2 space-y-0.5 text-xs text-slate-600">
                      {job.top.map((candidate, index) => (
                        <li key={`${job.id}-${candidate.name}-${index}`}>
                          {index + 1}. {candidate.name} · {candidate.score}%
                          resume match
                        </li>
                      ))}
                    </ol>
                  ) : null}
                </div>
                <LinkButton
                  href={`/recruiter/jobs/${job.id}`}
                  variant={job.unscreened > 0 ? "primary" : "secondary"}
                  size="sm"
                >
                  {job.applicants === 0
                    ? "Open"
                    : job.unscreened > 0
                      ? "Screen applicants"
                      : job.pendingShortlist > 0
                        ? "Shortlist top matches"
                        : "Review ranking"}
                </LinkButton>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
