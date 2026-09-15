import Link from "next/link";
import { Badge, Card } from "@/components/ui";
import { EDUCATION_LEVELS, EMPLOYMENT_TYPES, PROVINCES, labelFor } from "@/lib/constants";
import { daysUntil, formatDeadline } from "@/lib/format";

export type JobCardData = {
  id: string;
  code: string;
  title: string;
  department: string | null;
  city: string | null;
  province: string | null;
  employmentType: string;
  positions: number;
  payScale: string | null;
  minEducationLevel: string | null;
  minExperienceYears: number;
  closingDate: Date | null;
};

export function JobCard({
  job,
  applicantCount,
}: {
  job: JobCardData;
  applicantCount?: number;
}) {
  const days = daysUntil(job.closingDate);
  const isClosingSoon = days !== null && days >= 0 && days <= 7;
  const isClosed = days !== null && days < 0;

  const location = [job.city, job.province ? labelFor(PROVINCES, job.province) : null]
    .filter(Boolean)
    .join(", ");

  return (
    <Card className="flex h-full flex-col p-5 transition duration-300 hover:-translate-y-1 hover:border-teal-300 hover:shadow-lg hover:shadow-teal-900/5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Link
            href={`/jobs/${job.id}`}
            className="text-base font-semibold text-slate-900 hover:text-teal-700"
          >
            {job.title}
          </Link>
          <p className="mt-0.5 font-mono text-xs text-slate-500">{job.code}</p>
        </div>
        <Badge tone={isClosed ? "danger" : isClosingSoon ? "warning" : "neutral"}>
          {formatDeadline(job.closingDate)}
        </Badge>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {job.department ? (
          <Detail label="Department" value={job.department} />
        ) : null}
        {location ? <Detail label="Location" value={location} /> : null}
        {job.payScale ? <Detail label="Pay scale" value={job.payScale} /> : null}
        <Detail
          label="Positions"
          value={String(job.positions)}
        />
        <Detail
          label="Type"
          value={labelFor(EMPLOYMENT_TYPES, job.employmentType)}
        />
        {job.minEducationLevel ? (
          <Detail
            label="Minimum education"
            value={labelFor(EDUCATION_LEVELS, job.minEducationLevel)}
          />
        ) : null}
        {job.minExperienceYears > 0 ? (
          <Detail
            label="Experience"
            value={`${job.minExperienceYears}+ years`}
          />
        ) : null}
        {applicantCount !== undefined ? (
          <Detail label="Applicants" value={String(applicantCount)} />
        ) : null}
      </dl>
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-800">{value}</dd>
    </div>
  );
}
