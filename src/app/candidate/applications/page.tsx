import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { APPLICATION_STATUSES, labelFor } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { withdrawApplicationAction } from "@/lib/actions/applications";
import {
  Badge,
  Card,
  EmptyState,
  LinkButton,
  PageHeader,
  toneForApplicationStatus,
} from "@/components/ui";
import { ActionButton } from "@/components/action-button";

export const metadata: Metadata = { title: "My applications" };

export default async function ApplicationsPage() {
  const user = await requireRole("CANDIDATE");

  const candidate = await prisma.candidate.findUnique({
    where: { userId: user.id },
    select: {
      applications: {
        orderBy: { appliedAt: "desc" },
        include: {
          job: {
            select: { id: true, title: true, code: true, department: true },
          },
        },
      },
    },
  });

  const applications = candidate?.applications ?? [];

  return (
    <>
      <PageHeader
        title="My applications"
        description="Every position you have applied for, and where it stands."
        action={<LinkButton href="/jobs">Browse positions</LinkButton>}
      />

      {applications.length === 0 ? (
        <EmptyState
          title="You have not applied for anything yet"
          description="Browse the open positions and apply to the ones that match your qualifications."
          action={<LinkButton href="/jobs">Browse positions</LinkButton>}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {applications.map((application) => (
            <Card key={application.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/jobs/${application.job.id}`}
                      className="text-sm font-semibold text-slate-900 hover:text-teal-700"
                    >
                      {application.job.title}
                    </Link>
                    <Badge tone={toneForApplicationStatus(application.status)}>
                      {labelFor(APPLICATION_STATUSES, application.status)}
                    </Badge>
                  </div>
                  <p className="mt-1 font-mono text-xs text-slate-500">
                    {application.job.code}
                    {application.job.department
                      ? ` · ${application.job.department}`
                      : ""}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Applied {formatDate(application.appliedAt)} · Criteria match{" "}
                    {application.eligibilityScore}%
                  </p>

                  {application.recruiterNotes &&
                  application.status !== "SUBMITTED" ? (
                    <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                      <span className="font-medium">Recruiter note:</span>{" "}
                      {application.recruiterNotes}
                    </p>
                  ) : null}
                </div>

                {["SUBMITTED", "UNDER_REVIEW"].includes(application.status) ? (
                  <ActionButton
                    action={withdrawApplicationAction}
                    fields={{ applicationId: application.id }}
                    variant="secondary"
                    size="sm"
                    confirm="Withdraw this application? This cannot be undone."
                    pendingLabel="Withdrawing…"
                  >
                    Withdraw
                  </ActionButton>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
