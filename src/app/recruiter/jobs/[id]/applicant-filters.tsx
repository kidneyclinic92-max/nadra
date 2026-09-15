"use client";

import Link from "next/link";
import {
  APPLICATION_STATUSES,
  EDUCATION_LEVELS,
  PROVINCES,
} from "@/lib/constants";
import { Button, Input, Select } from "@/components/ui";

const SORT_OPTIONS = [
  { value: "score", label: "Best match first" },
  { value: "recent", label: "Most recent first" },
  { value: "name", label: "Name (A–Z)" },
];

const SCORE_OPTIONS = [
  { value: "0", label: "Any match" },
  { value: "50", label: "50% and above" },
  { value: "75", label: "75% and above" },
  { value: "100", label: "Meets every criterion" },
];

type Current = {
  status?: string;
  q?: string;
  domicile?: string;
  education?: string;
  minScore?: string;
  sort?: string;
};

export function ApplicantFilters({
  jobId,
  current,
}: {
  jobId: string;
  current: Current;
}) {
  const hasFilters = Boolean(
    current.status ||
      current.q ||
      current.domicile ||
      current.education ||
      (current.minScore && current.minScore !== "0"),
  );

  return (
    <form method="get" className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Input
          name="q"
          defaultValue={current.q ?? ""}
          placeholder="Search name or CNIC"
          aria-label="Search applicants"
        />
        <Select
          name="status"
          defaultValue={current.status ?? ""}
          options={APPLICATION_STATUSES}
          placeholder="Any status"
          aria-label="Filter by application status"
        />
        <Select
          name="minScore"
          defaultValue={current.minScore ?? "0"}
          options={SCORE_OPTIONS}
          aria-label="Filter by criteria match"
        />
        <Select
          name="education"
          defaultValue={current.education ?? ""}
          options={EDUCATION_LEVELS}
          placeholder="Any qualification held"
          aria-label="Filter by qualification"
        />
        <Select
          name="domicile"
          defaultValue={current.domicile ?? ""}
          options={PROVINCES}
          placeholder="Any domicile"
          aria-label="Filter by domicile province"
        />
        <Select
          name="sort"
          defaultValue={current.sort ?? "score"}
          options={SORT_OPTIONS}
          aria-label="Sort applicants"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" variant="secondary" size="sm">
          Apply filters
        </Button>
        {hasFilters ? (
          <Link
            href={`/recruiter/jobs/${jobId}`}
            className="text-sm font-medium text-slate-600 hover:text-slate-900 hover:underline"
          >
            Clear
          </Link>
        ) : null}
      </div>
    </form>
  );
}
