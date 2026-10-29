import Link from "next/link";
import { shortlistRecommendedAction } from "@/lib/actions/applications";
import { SCREENING_RECOMMENDATIONS, screeningBand } from "@/lib/constants";
import { ActionButton } from "@/components/action-button";
import { Badge, Card, CardBody, CardHeader, EmptyState } from "@/components/ui";

const STRONG_MIN =
  SCREENING_RECOMMENDATIONS.find((band) => band.value === "STRONG_MATCH")?.min ??
  80;

export type RankedApplicant = {
  id: string;
  status: string;
  candidateId: string;
  fullName: string;
  matchScore: number;
  recommendation: string | null;
  preferenceHits: number;
  preferenceTotal: number;
  matchedPreferences: string[];
};

export function RankedShortlist({
  jobId,
  ranked,
  vacancies,
}: {
  jobId: string;
  ranked: RankedApplicant[];
  vacancies: number;
}) {
  const recommended = ranked.filter(
    (row) =>
      row.matchScore >= STRONG_MIN &&
      row.status !== "SHORTLISTED" &&
      row.status !== "REJECTED" &&
      row.status !== "WITHDRAWN",
  );
  const alreadyShortlisted = ranked.filter(
    (row) => row.status === "SHORTLISTED",
  ).length;

  return (
    <Card>
      <CardHeader
        title="Ranked from AI screening"
        description={`Applicants with more preferred certifications and keywords rise first, then AI resume match. Strong matches score ${STRONG_MIN}% and above. This list does not change status until you shortlist.`}
        action={
          recommended.length > 0 ? (
            <ActionButton
              action={shortlistRecommendedAction}
              fields={{ jobId }}
              size="sm"
              confirm={`Shortlist ${recommended.length} strong match${recommended.length === 1 ? "" : "es"}? Weak matches will be left for you to review.`}
              pendingLabel="Shortlisting…"
            >
              Shortlist {recommended.length} strong match
              {recommended.length === 1 ? "" : "es"}
            </ActionButton>
          ) : null
        }
      />
      <CardBody className="p-0">
        {ranked.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="No scored resumes yet"
              description="Run AI screening to rank every applicant with a resume, then shortlist the top matches in one step."
            />
          </div>
        ) : (
          <ol className="divide-y divide-slate-200">
            {ranked.map((row, index) => {
              const band = screeningBand(row.recommendation);
              const isStrong = row.matchScore >= STRONG_MIN;
              return (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                >
                  <div className="flex min-w-0 items-baseline gap-3">
                    <span className="w-6 shrink-0 text-right font-mono text-xs text-slate-400">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <Link
                        href={`/recruiter/candidates/${row.candidateId}`}
                        className="text-sm font-medium text-slate-900 hover:text-teal-700"
                      >
                        {row.fullName}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {band?.label ?? "Scored"} · {band?.guidance ?? ""}
                        {row.preferenceTotal > 0
                          ? ` · ${row.preferenceHits} of ${row.preferenceTotal} preferences`
                          : ""}
                      </p>
                      {row.matchedPreferences.length > 0 ? (
                        <p className="mt-0.5 text-xs text-teal-700">
                          {row.matchedPreferences.join(" · ")}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`text-sm font-semibold tabular-nums ${
                        isStrong ? "text-emerald-700" : "text-slate-700"
                      }`}
                    >
                      {row.matchScore}%
                    </span>
                    {row.status === "SHORTLISTED" ? (
                      <Badge tone="success">Shortlisted</Badge>
                    ) : isStrong ? (
                      <Badge tone="success">Recommended</Badge>
                    ) : (
                      <Badge tone="neutral">Review</Badge>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        {ranked.length > 0 ? (
          <p className="border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
            {vacancies} advertised post{vacancies === 1 ? "" : "s"}.{" "}
            {alreadyShortlisted} already shortlisted
            {recommended.length > 0
              ? ` · ${recommended.length} strong match${recommended.length === 1 ? "" : "es"} not yet shortlisted`
              : ""}
            .
          </p>
        ) : null}
      </CardBody>
    </Card>
  );
}
