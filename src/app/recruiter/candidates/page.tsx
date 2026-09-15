import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import {
  EDUCATION_LEVELS,
  GENDERS,
  PROVINCES,
  QUOTA_CATEGORIES,
  labelFor,
} from "@/lib/constants";
import { ageInYears, totalExperienceYears } from "@/lib/eligibility";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Input,
  PageHeader,
  Select,
} from "@/components/ui";

export const metadata: Metadata = { title: "Candidate database" };

const PAGE_SIZE = 25;

type SearchParams = Promise<{
  q?: string;
  province?: string;
  domicile?: string;
  education?: string;
  quota?: string;
  gender?: string;
  page?: string;
}>;

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireStaff();
  const filters = await searchParams;

  const page = Math.max(1, Number(filters.page ?? "1") || 1);

  const where: Prisma.CandidateWhereInput = {
    ...(filters.province ? { province: filters.province } : {}),
    ...(filters.domicile ? { domicileProvince: filters.domicile } : {}),
    ...(filters.quota ? { quotaCategory: filters.quota } : {}),
    ...(filters.gender ? { gender: filters.gender } : {}),
    ...(filters.education
      ? { educations: { some: { level: filters.education } } }
      : {}),
    ...(filters.q
      ? {
          OR: [
            { fullName: { contains: filters.q } },
            { cnic: { contains: filters.q } },
            { mobile: { contains: filters.q } },
          ],
        }
      : {}),
  };

  const [candidates, total] = await Promise.all([
    prisma.candidate.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        educations: { orderBy: { passingYear: "desc" } },
        experiences: true,
        _count: { select: { applications: true, documents: true } },
      },
    }),
    prisma.candidate.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const queryString = (overrides: Record<string, string>) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...filters, ...overrides })) {
      if (value) params.set(key, String(value));
    }
    const query = params.toString();
    return query ? `?${query}` : "";
  };

  return (
    <>
      <PageHeader
        title="Candidate database"
        description={`${total} registered candidate${total === 1 ? "" : "s"} across all positions.`}
      />

      <Card className="mb-6">
        <CardHeader title="Search and filter" />
        <CardBody>
          <form method="get" className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Input
                name="q"
                defaultValue={filters.q ?? ""}
                placeholder="Name, CNIC or mobile"
                aria-label="Search candidates"
              />
              <Select
                name="education"
                defaultValue={filters.education ?? ""}
                options={EDUCATION_LEVELS}
                placeholder="Any qualification"
                aria-label="Filter by qualification"
              />
              <Select
                name="domicile"
                defaultValue={filters.domicile ?? ""}
                options={PROVINCES}
                placeholder="Any domicile"
                aria-label="Filter by domicile"
              />
              <Select
                name="province"
                defaultValue={filters.province ?? ""}
                options={PROVINCES}
                placeholder="Any current province"
                aria-label="Filter by current province"
              />
              <Select
                name="quota"
                defaultValue={filters.quota ?? ""}
                options={QUOTA_CATEGORIES}
                placeholder="Any quota category"
                aria-label="Filter by quota"
              />
              <Select
                name="gender"
                defaultValue={filters.gender ?? ""}
                options={GENDERS}
                placeholder="Any gender"
                aria-label="Filter by gender"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button type="submit" variant="secondary" size="sm">
                Search
              </Button>
              <Link
                href="/recruiter/candidates"
                className="text-sm font-medium text-slate-600 hover:underline"
              >
                Clear
              </Link>
            </div>
          </form>
        </CardBody>
      </Card>

      {candidates.length === 0 ? (
        <EmptyState
          title="No candidates match your search"
          description="Try removing some filters, or search by a partial name or CNIC."
        />
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {candidates.map((candidate) => {
              const highest = candidate.educations[0];
              const age = ageInYears(candidate.dateOfBirth);
              const experience = totalExperienceYears(candidate.experiences);

              return (
                <Card key={candidate.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/recruiter/candidates/${candidate.id}`}
                          className="text-sm font-semibold text-slate-900 hover:text-teal-700"
                        >
                          {candidate.fullName}
                        </Link>
                        {candidate.quotaCategory !== "OPEN_MERIT" ? (
                          <Badge tone="info">
                            {labelFor(QUOTA_CATEGORIES, candidate.quotaCategory)}
                          </Badge>
                        ) : null}
                        {!candidate.isProfileComplete ? (
                          <Badge tone="warning">Incomplete profile</Badge>
                        ) : null}
                      </div>

                      <p className="mt-1 font-mono text-xs text-slate-500">
                        {candidate.cnic} · {candidate.mobile}
                      </p>

                      <p className="mt-1 text-sm text-slate-600">
                        {highest
                          ? `${highest.degreeTitle} (${highest.passingYear})`
                          : "No education recorded"}
                        {experience > 0 ? ` · ${experience} yrs experience` : ""}
                        {age !== null ? ` · ${age} yrs old` : ""}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Domicile:{" "}
                        {candidate.domicileProvince
                          ? labelFor(PROVINCES, candidate.domicileProvince)
                          : "—"}
                        {candidate.city ? ` · Based in ${candidate.city}` : ""}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-6 text-right">
                      <div>
                        <p className="text-xs text-slate-500">Applications</p>
                        <p className="text-lg font-semibold text-slate-900">
                          {candidate._count.applications}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Documents</p>
                        <p className="text-lg font-semibold text-slate-900">
                          {candidate._count.documents}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {totalPages > 1 ? (
            <nav className="mt-6 flex items-center justify-between gap-4">
              <p className="text-sm text-slate-600">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                {page > 1 ? (
                  <Link
                    href={`/recruiter/candidates${queryString({ page: String(page - 1) })}`}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Previous
                  </Link>
                ) : null}
                {page < totalPages ? (
                  <Link
                    href={`/recruiter/candidates${queryString({ page: String(page + 1) })}`}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Next
                  </Link>
                ) : null}
              </div>
            </nav>
          ) : null}
        </>
      )}
    </>
  );
}
