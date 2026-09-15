import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { JobCard } from "@/components/job-card";
import { Button, EmptyState, Input, PageHeader, Select } from "@/components/ui";
import { EDUCATION_LEVELS, PROVINCES } from "@/lib/constants";

export const metadata: Metadata = { title: "Open positions" };

type SearchParams = Promise<{
  q?: string;
  province?: string;
  education?: string;
}>;

export default async function JobsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { q = "", province = "", education = "" } = await searchParams;

  const jobs = await prisma.job.findMany({
    where: {
      status: "OPEN",
      ...(q
        ? {
            OR: [
              { title: { contains: q } },
              { code: { contains: q } },
              { department: { contains: q } },
              { description: { contains: q } },
            ],
          }
        : {}),
      ...(province ? { province } : {}),
      ...(education ? { minEducationLevel: education } : {}),
    },
    orderBy: [{ closingDate: "asc" }, { createdAt: "desc" }],
  });

  const hasFilters = Boolean(q || province || education);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <PageHeader
        title="Open positions"
        description="Applications are accepted until the closing date shown on each position."
      />

      <form
        method="get"
        className="mb-8 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_auto_auto_auto]"
      >
        <Input
          name="q"
          defaultValue={q}
          placeholder="Search by title, code or department"
          aria-label="Search positions"
        />
        <Select
          name="province"
          defaultValue={province}
          options={PROVINCES}
          placeholder="All provinces"
          aria-label="Filter by province"
        />
        <Select
          name="education"
          defaultValue={education}
          options={EDUCATION_LEVELS}
          placeholder="Any qualification"
          aria-label="Filter by minimum qualification"
        />
        <Button type="submit" variant="secondary">
          Filter
        </Button>
      </form>

      {jobs.length === 0 ? (
        <EmptyState
          title={hasFilters ? "No positions match your filters" : "No open positions"}
          description={
            hasFilters
              ? "Try widening your search, or clear the filters to see everything currently advertised."
              : "Check back soon — new positions are advertised regularly."
          }
        />
      ) : (
        <>
          <p className="mb-4 text-sm text-slate-600">
            {jobs.length} position{jobs.length === 1 ? "" : "s"} found
          </p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
