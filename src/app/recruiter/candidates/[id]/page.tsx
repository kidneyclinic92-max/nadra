import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import {
  APPLICATION_STATUSES,
  DOCUMENT_TYPES,
  EDUCATION_LEVELS,
  EMPLOYMENT_TYPES,
  GENDERS,
  GUARDIAN_RELATIONS,
  MARITAL_STATUSES,
  PROVINCES,
  QUOTA_CATEGORIES,
  formatBytes,
  labelFor,
} from "@/lib/constants";
import { ageInYears, totalExperienceYears } from "@/lib/eligibility";
import { formatDate } from "@/lib/format";
import {
  Alert,
  Badge,
  Card,
  CardBody,
  CardHeader,
  DescriptionList,
  LinkButton,
  PageHeader,
  toneForApplicationStatus,
} from "@/components/ui";

type Params = Promise<{ id: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id } = await params;
  const candidate = await prisma.candidate.findUnique({
    where: { id },
    select: { fullName: true },
  });
  return { title: candidate?.fullName ?? "Candidate" };
}

export default async function CandidateDetailPage({
  params,
}: {
  params: Params;
}) {
  await requireStaff();
  const { id } = await params;

  const candidate = await prisma.candidate.findUnique({
    where: { id },
    include: {
      user: { select: { email: true, createdAt: true } },
      educations: { orderBy: { passingYear: "desc" } },
      experiences: { orderBy: { startDate: "desc" } },
      documents: { orderBy: { createdAt: "desc" } },
      applications: {
        orderBy: { appliedAt: "desc" },
        include: { job: { select: { id: true, title: true, code: true } } },
      },
    },
  });

  if (!candidate) notFound();

  const age = ageInYears(candidate.dateOfBirth);
  const experienceYears = totalExperienceYears(candidate.experiences);

  const missingDocuments = DOCUMENT_TYPES.filter(
    (t) => t.required && !candidate.documents.some((d) => d.type === t.value),
  );

  return (
    <>
      <PageHeader
        title={candidate.fullName}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs">{candidate.cnic}</span>
            {candidate.quotaCategory !== "OPEN_MERIT" ? (
              <Badge tone="info">
                {labelFor(QUOTA_CATEGORIES, candidate.quotaCategory)}
              </Badge>
            ) : null}
            {candidate.isProfileComplete ? (
              <Badge tone="success">Profile complete</Badge>
            ) : (
              <Badge tone="warning">Profile incomplete</Badge>
            )}
          </span>
        }
        action={
          <LinkButton href="/recruiter/candidates" variant="secondary">
            Back to database
          </LinkButton>
        }
      />

      {missingDocuments.length > 0 ? (
        <div className="mb-6">
          <Alert tone="warning" title="Missing required documents">
            {missingDocuments.map((d) => d.label).join(", ")}
          </Alert>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader title="Personal details" />
            <CardBody>
              <DescriptionList
                items={[
                  { label: "Full name", value: candidate.fullName },
                  {
                    label: `${labelFor(GUARDIAN_RELATIONS, candidate.guardianRelation)}'s name`,
                    value: candidate.guardianName || "—",
                  },
                  { label: "CNIC", value: candidate.cnic },
                  {
                    label: "Date of birth",
                    value: candidate.dateOfBirth
                      ? `${formatDate(candidate.dateOfBirth)}${age !== null ? ` (${age} years)` : ""}`
                      : "—",
                  },
                  { label: "Gender", value: labelFor(GENDERS, candidate.gender) },
                  {
                    label: "Marital status",
                    value: labelFor(MARITAL_STATUSES, candidate.maritalStatus),
                  },
                  { label: "Religion", value: candidate.religion ?? "—" },
                  { label: "Nationality", value: candidate.nationality },
                ]}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Contact and address" />
            <CardBody>
              <DescriptionList
                items={[
                  { label: "Mobile", value: candidate.mobile },
                  { label: "Alternate number", value: candidate.alternateMobile ?? "—" },
                  {
                    label: "Email",
                    value: candidate.contactEmail ?? candidate.user.email,
                  },
                  {
                    label: "LinkedIn",
                    value: candidate.linkedinUrl ? (
                      <a
                        href={candidate.linkedinUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-teal-700 hover:underline"
                      >
                        View profile
                      </a>
                    ) : (
                      "—"
                    ),
                  },
                  {
                    label: "Portfolio",
                    value: candidate.portfolioUrl ? (
                      <a
                        href={candidate.portfolioUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-teal-700 hover:underline"
                      >
                        View site
                      </a>
                    ) : (
                      "—"
                    ),
                  },
                  { label: "Current address", value: candidate.currentAddress ?? "—" },
                  {
                    label: "Permanent address",
                    value: candidate.permanentAddress ?? "—",
                  },
                  {
                    label: "City / province",
                    value:
                      [
                        candidate.city,
                        candidate.province
                          ? labelFor(PROVINCES, candidate.province)
                          : null,
                      ]
                        .filter(Boolean)
                        .join(", ") || "—",
                  },
                  {
                    label: "Domicile",
                    value:
                      [
                        candidate.domicileDistrict,
                        candidate.domicileProvince
                          ? labelFor(PROVINCES, candidate.domicileProvince)
                          : null,
                      ]
                        .filter(Boolean)
                        .join(", ") || "—",
                  },
                  {
                    label: "Disability",
                    value: candidate.hasDisability
                      ? (candidate.disabilityDetails ?? "Declared")
                      : "None declared",
                  },
                ]}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Education"
              description={`${candidate.educations.length} record${candidate.educations.length === 1 ? "" : "s"}`}
            />
            {candidate.educations.length === 0 ? (
              <CardBody>
                <p className="text-sm text-slate-500">
                  No education records added.
                </p>
              </CardBody>
            ) : (
              <ul className="divide-y divide-slate-200">
                {candidate.educations.map((education) => (
                  <li key={education.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">
                        {education.degreeTitle}
                      </p>
                      <Badge tone="info">
                        {labelFor(EDUCATION_LEVELS, education.level)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {education.institution}
                      {education.boardOrUniversity
                        ? ` · ${education.boardOrUniversity}`
                        : ""}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Passed {education.passingYear}
                      {education.majorSubjects
                        ? ` · ${education.majorSubjects}`
                        : ""}
                      {" · "}
                      {formatResult(education)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Experience"
              description={
                experienceYears > 0
                  ? `${experienceYears} years total`
                  : "No experience recorded"
              }
            />
            {candidate.experiences.length === 0 ? (
              <CardBody>
                <p className="text-sm text-slate-500">
                  No experience records added.
                </p>
              </CardBody>
            ) : (
              <ul className="divide-y divide-slate-200">
                {candidate.experiences.map((experience) => (
                  <li key={experience.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">
                        {experience.designation}
                      </p>
                      {experience.isCurrent ? (
                        <Badge tone="success">Current</Badge>
                      ) : null}
                      {experience.employmentType ? (
                        <Badge tone="neutral">
                          {labelFor(EMPLOYMENT_TYPES, experience.employmentType)}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {experience.organization}
                      {experience.department ? ` · ${experience.department}` : ""}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {formatDate(experience.startDate)} —{" "}
                      {experience.isCurrent
                        ? "Present"
                        : formatDate(experience.endDate)}
                    </p>
                    {experience.responsibilities ? (
                      <p className="mt-2 text-sm whitespace-pre-line text-slate-600">
                        {experience.responsibilities}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader
              title="Documents"
              description="Opens in a new tab. Access is logged to your account."
            />
            {candidate.documents.length === 0 ? (
              <CardBody>
                <p className="text-sm text-slate-500">No documents uploaded.</p>
              </CardBody>
            ) : (
              <ul className="divide-y divide-slate-200">
                {candidate.documents.map((document) => (
                  <li
                    key={document.id}
                    className="flex items-center justify-between gap-3 px-5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {labelFor(DOCUMENT_TYPES, document.type)}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {document.label || document.originalName} ·{" "}
                        {formatBytes(document.sizeBytes)}
                      </p>
                    </div>
                    <a
                      href={`/api/documents/${document.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Open
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Applications" />
            {candidate.applications.length === 0 ? (
              <CardBody>
                <p className="text-sm text-slate-500">
                  This candidate has not applied to any position.
                </p>
              </CardBody>
            ) : (
              <ul className="divide-y divide-slate-200">
                {candidate.applications.map((application) => (
                  <li key={application.id} className="px-5 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/recruiter/jobs/${application.job.id}`}
                        className="text-sm font-medium text-slate-900 hover:text-teal-700"
                      >
                        {application.job.title}
                      </Link>
                      <Badge tone={toneForApplicationStatus(application.status)}>
                        {labelFor(APPLICATION_STATUSES, application.status)}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatDate(application.appliedAt)} ·{" "}
                      {application.eligibilityScore}% match
                    </p>
                    {application.coverNote ? (
                      <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        {application.coverNote}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Account" />
            <CardBody>
              <DescriptionList
                items={[
                  { label: "Login email", value: candidate.user.email },
                  {
                    label: "Registered",
                    value: formatDate(candidate.user.createdAt),
                  },
                ]}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

function formatResult(education: {
  resultType: string;
  obtainedMarks: number | null;
  totalMarks: number | null;
  cgpa: number | null;
  maxCgpa: number | null;
  grade: string | null;
}): string {
  if (education.resultType === "CGPA" && education.cgpa != null) {
    return `CGPA ${education.cgpa}${education.maxCgpa ? ` / ${education.maxCgpa}` : ""}`;
  }
  if (
    education.resultType === "MARKS" &&
    education.obtainedMarks != null &&
    education.totalMarks != null
  ) {
    const percentage = Math.round(
      (education.obtainedMarks / education.totalMarks) * 100,
    );
    return `${education.obtainedMarks} / ${education.totalMarks} (${percentage}%)`;
  }
  return education.grade ? `Grade ${education.grade}` : "Result not provided";
}
