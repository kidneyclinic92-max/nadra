import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { DOCUMENT_TYPES } from "@/lib/constants";
import {
  Alert,
  Badge,
  Card,
  CardBody,
  CardHeader,
  LinkButton,
  PageHeader,
  Stat,
} from "@/components/ui";

export const metadata: Metadata = { title: "Overview" };

export default async function CandidateOverviewPage() {
  const user = await requireRole("CANDIDATE");

  const candidate = await prisma.candidate.findUnique({
    where: { userId: user.id },
    include: {
      educations: { select: { id: true } },
      experiences: { select: { id: true } },
      documents: { select: { id: true, type: true } },
      applications: { select: { id: true, status: true } },
    },
  });

  if (!candidate) {
    return (
      <Alert tone="warning" title="Set up your profile">
        <p className="mt-1">We could not find your candidate profile.</p>
        <LinkButton href="/candidate/profile" size="sm" className="mt-3">
          Create profile
        </LinkButton>
      </Alert>
    );
  }

  const uploadedTypes = new Set(candidate.documents.map((d) => d.type));
  const requiredDocuments = DOCUMENT_TYPES.filter((d) => d.required);
  const missingDocuments = requiredDocuments.filter(
    (d) => !uploadedTypes.has(d.value),
  );

  const checklist = [
    {
      label: "Personal details",
      done: candidate.isProfileComplete,
      href: "/candidate/profile",
      detail: candidate.isProfileComplete
        ? "All required fields provided"
        : "Some required fields are still empty",
    },
    {
      label: "Education records",
      done: candidate.educations.length > 0,
      href: "/candidate/education",
      detail:
        candidate.educations.length > 0
          ? `${candidate.educations.length} record${candidate.educations.length === 1 ? "" : "s"} added`
          : "Add at least your highest qualification",
    },
    {
      label: "Required documents",
      done: missingDocuments.length === 0,
      href: "/candidate/documents",
      detail:
        missingDocuments.length === 0
          ? "All required documents uploaded"
          : `${missingDocuments.length} still missing: ${missingDocuments.map((d) => d.label).join(", ")}`,
    },
  ];

  const completedSteps = checklist.filter((c) => c.done).length;
  const readyToApply = completedSteps === checklist.length;

  const shortlistedCount = candidate.applications.filter(
    (a) => a.status === "SHORTLISTED",
  ).length;

  return (
    <>
      <PageHeader
        title={`Welcome, ${candidate.fullName.split(" ")[0]}`}
        description="Keep your profile current so you can apply to any position in a single step."
        action={<LinkButton href="/jobs">Browse positions</LinkButton>}
      />

      {!readyToApply ? (
        <div className="mb-6">
          <Alert tone="warning" title="Your profile is not ready for applications">
            Complete the {checklist.length - completedSteps} remaining step
            {checklist.length - completedSteps === 1 ? "" : "s"} below before
            applying.
          </Alert>
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Applications" value={candidate.applications.length} />
        <Stat
          label="Shortlisted"
          value={shortlistedCount}
          tone={shortlistedCount > 0 ? "success" : "neutral"}
        />
        <Stat
          label="Documents"
          value={candidate.documents.length}
          tone={missingDocuments.length > 0 ? "warning" : "success"}
        />
      </div>

      <Card>
        <CardHeader
          title="Profile checklist"
          description={`${completedSteps} of ${checklist.length} steps complete`}
        />
        <ul className="divide-y divide-slate-200">
          {checklist.map((item) => (
            <li key={item.label}>
              <Link
                href={item.href}
                className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-slate-50"
              >
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className={
                      item.done
                        ? "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700"
                        : "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-400"
                    }
                  >
                    {item.done ? "✓" : ""}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-500">{item.detail}</p>
                  </div>
                </div>
                <Badge tone={item.done ? "success" : "warning"}>
                  {item.done ? "Done" : "Pending"}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
        <CardBody className="border-t border-slate-200 bg-slate-50">
          <p className="text-sm text-slate-600">
            Experience records are optional, but adding them improves how you
            match positions that require prior service.
          </p>
        </CardBody>
      </Card>
    </>
  );
}
