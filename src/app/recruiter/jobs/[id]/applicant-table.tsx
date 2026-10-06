"use client";

import Link from "next/link";
import { Fragment, useActionState, useState, type ReactNode } from "react";
import {
  ChevronDown,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { updateApplicationStatusAction } from "@/lib/actions/applications";
import { rescreenApplicationAction } from "@/lib/actions/ai-screening";
import { idleState } from "@/lib/form";
import {
  APPLICATION_STATUSES,
  EXTRACTION_METHODS,
  QUOTA_CATEGORIES,
  SCREENING_CONFIDENCE,
  SCREENING_PARAMETERS,
  SCREENING_RECOMMENDATIONS,
  SCREENING_VERDICTS,
  labelFor,
  screeningBand,
  type ScreeningParameterResult,
} from "@/lib/constants";
import {
  Alert,
  Badge,
  Input,
  Select,
  cn,
  toneForApplicationStatus,
  type BadgeTone,
} from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export type ApplicantAi = {
  status: string;
  matchScore: number | null;
  recommendation: string | null;
  summary: string | null;
  strengths: string[];
  gaps: string[];
  matchedSkills: string[];
  missingSkills: string[];
  parameters: ScreeningParameterResult[];
  confidence: string | null;
  error: string | null;
  scannedAt: string | null;
  /** Audit trail: what was read, how, and by which model. */
  resumeDocumentId: string | null;
  extractionMethod: string | null;
  modelName: string | null;
  promptVersion: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
};

export type ApplicantRow = {
  id: string;
  status: string;
  appliedAt: string;
  recruiterNotes: string | null;
  score: number;
  meetsAll: boolean;
  failedCriteria: string[];
  ai: ApplicantAi | null;
  candidate: {
    id: string;
    fullName: string;
    cnic: string;
    city: string | null;
    domicileProvince: string | null;
    quotaCategory: string;
    mobile: string;
  };
};

const DECISION_OPTIONS = APPLICATION_STATUSES.filter(
  (s) => s.value !== "WITHDRAWN",
);

const RECOMMENDATION_TONES: Record<string, BadgeTone> = {
  STRONG_MATCH: "success",
  POSSIBLE_MATCH: "warning",
  WEAK_MATCH: "neutral",
};

function AiCell({
  ai,
  row,
  isExpanded,
  onToggle,
}: {
  ai: ApplicantAi | null;
  row: Pick<ApplicantRow, "meetsAll" | "failedCriteria" | "score">;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  if (!ai) {
    return <span className="text-xs text-slate-400">Not screened</span>;
  }

  if (ai.status !== "COMPLETED") {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="flex items-start gap-1.5 text-left text-xs font-medium text-amber-700 hover:underline"
      >
        <TriangleAlert className="mt-px size-3.5 shrink-0" />
        {ai.status === "NEEDS_MANUAL_REVIEW" ? "Needs manual review" : "Failed"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isExpanded}
      className="group flex flex-col items-start gap-1 text-left"
    >
      <span className="flex items-center gap-1.5">
        <Badge tone={RECOMMENDATION_TONES[ai.recommendation ?? ""] ?? "neutral"}>
          {ai.matchScore}%
        </Badge>
        <ChevronDown
          className={cn(
            "size-3.5 text-slate-400 transition-transform",
            isExpanded && "rotate-180",
          )}
        />
      </span>
      <span className="text-xs text-slate-500 group-hover:text-teal-700">
        {labelFor(SCREENING_RECOMMENDATIONS, ai.recommendation)}
      </span>
      {/* Marks the rows where the model and the criteria check disagree, so
          they can be found without expanding every applicant. */}
      {divergenceNote(ai, row) ? (
        <span className="flex items-center gap-1 text-xs font-medium text-amber-700">
          <TriangleAlert className="size-3" />
          Review
        </span>
      ) : null}
    </button>
  );
}

/**
 * Flags where the model and the deterministic criteria check disagree. They
 * measure different things — one reads the resume, the other tests the
 * published criteria — so a divergence is not an error. It is the most
 * useful thing on the row, because it is where a recruiter's judgement is
 * actually needed.
 */
function divergenceNote(
  ai: ApplicantAi,
  row: Pick<ApplicantRow, "meetsAll" | "failedCriteria" | "score">,
): string | null {
  if (ai.status !== "COMPLETED" || ai.matchScore === null) return null;

  // Passes every published criterion, yet the resume evidences little. The
  // criteria check cannot read the resume, so this is the case where it is
  // most likely to be satisfied on paper only.
  if (row.meetsAll && ai.matchScore < 50) {
    return "Meets every published criterion, but the resume evidences little that is relevant to this post. Worth reading the resume yourself before shortlisting.";
  }

  // Fails most criteria, yet the resume reads as directly relevant. Usually
  // means the recorded profile is incomplete rather than the candidate weak.
  if (row.score < 50 && ai.matchScore >= 80) {
    return `The resume reads as directly relevant, yet the recorded profile fails ${row.failedCriteria.join(", ")}. Check the profile against their documents — it may be incomplete rather than the candidate unsuitable.`;
  }

  return null;
}

function AiDetail({
  ai,
  row,
  applicationId,
}: {
  ai: ApplicantAi;
  row: Pick<ApplicantRow, "meetsAll" | "failedCriteria" | "score">;
  applicationId: string;
}) {
  const [state, formAction] = useActionState(rescreenApplicationAction, idleState);
  const band = screeningBand(ai.recommendation);
  const divergence = divergenceNote(ai, row);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      {ai.status === "COMPLETED" ? (
        <>
          {/* What the score means, in the same words the model was given. */}
          {band ? (
            <p className="text-xs text-slate-500">
              <span className="font-medium text-slate-700">
                {ai.matchScore}% — {band.label}
              </span>{" "}
              · scores {band.min}–{band.max} mean the resume {band.guidance}.
              {ai.confidence ? (
                <>
                  {" "}
                  · {labelFor(SCREENING_CONFIDENCE, ai.confidence)}
                </>
              ) : null}
            </p>
          ) : null}

          {divergence ? (
            <div className="mt-3">
              <Alert tone="warning">{divergence}</Alert>
            </div>
          ) : null}

          {ai.extractionMethod === "VISION" ? (
            <p className="mt-3 flex items-start gap-1.5 text-xs text-amber-700">
              <TriangleAlert className="mt-px size-3.5 shrink-0" />
              This resume had no text layer, so it was read by image
              recognition. Treat the detail below as less reliable than usual.
            </p>
          ) : null}

          {ai.summary ? (
            <>
              <p className="mt-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Assessment
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">
                {ai.summary}
              </p>
            </>
          ) : null}

          {ai.parameters.length > 0 ? (
            <>
              <ParameterBreakdown parameters={ai.parameters} />
              {ai.matchedSkills.length > 0 || ai.missingSkills.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {ai.matchedSkills.map((skill) => (
                    <Badge key={`m-${skill}`} tone="success">
                      {skill}
                    </Badge>
                  ))}
                  {ai.missingSkills.map((skill) => (
                    <Badge key={`x-${skill}`} tone="danger">
                      {skill}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <AiList
                  label="Evidence found in the resume"
                  items={ai.strengths}
                  tone="success"
                />
                <AiList
                  label="Requirements not evidenced"
                  items={ai.gaps}
                  tone="danger"
                />
              </div>

              {ai.matchedSkills.length > 0 ? (
                <div className="mt-3">
                  <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                    Required skills evidenced
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {ai.matchedSkills.map((skill) => (
                      <Badge key={`m-${skill}`} tone="success">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}

              {ai.missingSkills.length > 0 ? (
                <div className="mt-3">
                  <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                    Required skills not found
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {ai.missingSkills.map((skill) => (
                      <Badge key={`x-${skill}`} tone="danger">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </>
      ) : (
        <>
          <p className="text-sm text-slate-700">
            {ai.error ?? "This resume could not be screened automatically."}
          </p>
          <p className="mt-1.5 text-xs text-slate-500">
            No score was recorded. Assess this applicant from their documents.
          </p>
        </>
      )}

      <AiProvenance ai={ai} />

      {state.status !== "idle" && state.message ? (
        <div className="mt-3">
          <Alert tone={state.status === "success" ? "success" : "danger"}>
            {state.message}
          </Alert>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          Advisory only — no score changes an application&apos;s status.
        </p>
        <form action={formAction}>
          <input type="hidden" name="applicationId" value={applicationId} />
          <SubmitButton variant="secondary" size="sm" pendingLabel="Re-screening…">
            <RefreshCw className="size-3.5" />
            Re-screen
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}

/**
 * The audit trail. A recruiter defending a shortlist needs to show exactly
 * which document was read, how it was read, and by what.
 */
function AiProvenance({ ai }: { ai: ApplicantAi }) {
  const facts: { term: string; detail: ReactNode }[] = [];

  if (ai.resumeDocumentId) {
    facts.push({
      term: "Document assessed",
      detail: (
        <a
          href={`/api/documents/${ai.resumeDocumentId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-medium text-teal-700 hover:underline"
        >
          Open the resume
          <ExternalLink className="size-3" />
        </a>
      ),
    });
  }

  if (ai.extractionMethod) {
    facts.push({
      term: "Read via",
      detail: labelFor(EXTRACTION_METHODS, ai.extractionMethod),
    });
  }

  if (ai.modelName) {
    facts.push({
      term: "Model",
      detail: (
        <span className="font-mono text-[11px]">
          {ai.modelName}
          {ai.promptVersion ? ` · prompt ${ai.promptVersion}` : ""}
        </span>
      ),
    });
  }

  if (ai.scannedAt) {
    facts.push({
      term: "Screened",
      detail:
        ai.inputTokens != null && ai.outputTokens != null
          ? `${ai.scannedAt} · ${ai.inputTokens} in / ${ai.outputTokens} out tokens`
          : ai.scannedAt,
    });
  }

  if (facts.length === 0) return null;

  return (
    <div className="mt-4 border-t border-slate-200 pt-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">
        <ShieldCheck className="size-3.5" />
        How this was produced
      </p>

      <dl className="mt-2 grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
        {facts.map((fact) => (
          <div key={fact.term} className="flex gap-1.5">
            <dt className="shrink-0 text-slate-500">{fact.term}:</dt>
            <dd className="text-slate-700">{fact.detail}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-2 text-xs text-slate-500">
        Name, gender, age, CNIC, contact details and quota status were removed
        from the resume before it was sent for assessment, and the model is
        instructed to ignore any that remain.
      </p>
    </div>
  );
}

function ParameterBreakdown({
  parameters,
}: {
  parameters: ScreeningParameterResult[];
}) {
  const assessedWeight = parameters.reduce((sum, p) => {
    if (p.verdict === "NOT_APPLICABLE") return sum;
    return sum + (SCREENING_PARAMETERS.find((s) => s.value === p.id)?.weight ?? 0);
  }, 0);

  return (
    <div className="mt-4">
      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
        Evidence by parameter
      </p>
      <p className="mt-1 text-xs text-slate-500">
        The overall score is a weighted average of these parameters. Age, gender,
        domicile and quota are not used.
      </p>

      <ol className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200">
        {parameters.map((parameter) => {
          const spec = SCREENING_PARAMETERS.find((s) => s.value === parameter.id);
          const share =
            parameter.verdict === "NOT_APPLICABLE" || assessedWeight === 0
              ? 0
              : Math.round(
                  ((spec?.weight ?? 0) / assessedWeight) * parameter.score,
                );

          return (
            <li key={parameter.id} className="bg-white px-3 py-3 sm:px-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {spec?.label ?? parameter.id}
                  </p>
                  <p className="text-xs text-slate-500">
                    {parameter.verdict === "NOT_APPLICABLE"
                      ? "Not advertised for this post"
                      : `Weight ${spec?.weight ?? 0}% · contributes ${share} point${share === 1 ? "" : "s"}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {parameter.verdict !== "NOT_APPLICABLE" ? (
                    <span className="tabular-nums text-sm font-semibold text-slate-900">
                      {parameter.score}%
                    </span>
                  ) : null}
                  <Badge tone={toneForVerdict(parameter.verdict)}>
                    {labelFor(SCREENING_VERDICTS, parameter.verdict)}
                  </Badge>
                </div>
              </div>

              {parameter.verdict !== "NOT_APPLICABLE" ? (
                <div
                  className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"
                  aria-hidden
                >
                  <div
                    className={cn(
                      "h-full rounded-full",
                      parameter.verdict === "MET"
                        ? "bg-emerald-500"
                        : parameter.verdict === "PARTIAL"
                          ? "bg-amber-400"
                          : "bg-slate-300",
                    )}
                    style={{ width: `${parameter.score}%` }}
                  />
                </div>
              ) : null}

              <dl className="mt-2.5 grid gap-2 text-sm">
                <div>
                  <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                    Advertised requirement
                  </dt>
                  <dd className="mt-0.5 text-slate-700">{parameter.requirement}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                    Evidence from the resume
                  </dt>
                  <dd className="mt-0.5 border-l-2 border-teal-200 pl-2 text-slate-700 italic">
                    {parameter.evidence}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                    Finding
                  </dt>
                  <dd className="mt-0.5 text-slate-700">{parameter.finding}</dd>
                </div>
              </dl>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function toneForVerdict(verdict: string): BadgeTone {
  switch (verdict) {
    case "MET":
      return "success";
    case "PARTIAL":
      return "warning";
    case "NOT_EVIDENCED":
      return "danger";
    default:
      return "neutral";
  }
}

function AiList({
  label,
  items,
  tone,
}: {
  label: string;
  items: string[];
  tone: "success" | "danger";
}) {
  if (items.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
        {label}
      </p>
      <ul className="mt-1.5 flex flex-col gap-1">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm text-slate-700">
            <span
              className={cn(
                "mt-1.5 size-1.5 shrink-0 rounded-full",
                tone === "success" ? "bg-emerald-500" : "bg-red-400",
              )}
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ApplicantTable({ rows }: { rows: ApplicantRow[] }) {
  const [state, formAction] = useActionState(
    updateApplicationStatusAction,
    idleState,
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const allSelected = rows.length > 0 && selected.length === rows.length;

  function toggleAll() {
    setSelected(allSelected ? [] : rows.map((r) => r.id));
  }

  function toggleOne(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }

  return (
    <form action={formAction}>
      {state.status !== "idle" && state.message ? (
        <div className="px-5 pt-4">
          <Alert tone={state.status === "success" ? "success" : "danger"}>
            {state.message}
          </Alert>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-5 py-3">
        <span className="text-sm text-slate-600">
          {selected.length > 0
            ? `${selected.length} selected`
            : "Select applicants to shortlist or reject"}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Input
            name="recruiterNotes"
            placeholder="Note (optional)"
            className="w-48"
            disabled={selected.length === 0}
          />
          <Select
            name="status"
            options={DECISION_OPTIONS}
            defaultValue="SHORTLISTED"
            className="w-40"
            disabled={selected.length === 0}
            aria-label="Decision"
          />
          <SubmitButton
            size="sm"
            disabled={selected.length === 0}
            pendingLabel="Updating…"
          >
            Apply to selected
          </SubmitButton>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
            <tr>
              <th scope="col" className="w-10 px-5 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all applicants"
                  className="size-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                Candidate
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                Domicile
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                Criteria
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                AI match
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                Applied
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                Status
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map((row) => {
              const isSelected = selected.includes(row.id);
              const isExpanded = expanded === row.id;
              return (
                <Fragment key={row.id}>
                <tr
                  className={isSelected ? "bg-teal-50/50" : "hover:bg-slate-50"}
                >
                  <td className="px-5 py-3 align-top">
                    <input
                      type="checkbox"
                      name="applicationIds"
                      value={row.id}
                      checked={isSelected}
                      onChange={() => toggleOne(row.id)}
                      aria-label={`Select ${row.candidate.fullName}`}
                      className="size-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                  </td>

                  <td className="px-3 py-3 align-top">
                    <Link
                      href={`/recruiter/candidates/${row.candidate.id}`}
                      className="font-medium text-slate-900 hover:text-teal-700"
                    >
                      {row.candidate.fullName}
                    </Link>
                    <p className="mt-0.5 font-mono text-xs text-slate-500">
                      {row.candidate.cnic}
                    </p>
                    <p className="text-xs text-slate-500">{row.candidate.mobile}</p>
                    {row.candidate.quotaCategory !== "OPEN_MERIT" ? (
                      <Badge tone="info" className="mt-1">
                        {labelFor(QUOTA_CATEGORIES, row.candidate.quotaCategory)}
                      </Badge>
                    ) : null}
                  </td>

                  <td className="px-3 py-3 align-top text-slate-600">
                    {row.candidate.domicileProvince ?? "—"}
                    {row.candidate.city ? (
                      <p className="text-xs text-slate-500">{row.candidate.city}</p>
                    ) : null}
                  </td>

                  <td className="px-3 py-3 align-top">
                    <Badge
                      tone={
                        row.meetsAll
                          ? "success"
                          : row.score >= 50
                            ? "warning"
                            : "danger"
                      }
                    >
                      {row.score}%
                    </Badge>
                    {row.failedCriteria.length > 0 ? (
                      <p className="mt-1 text-xs text-slate-500">
                        Missing: {row.failedCriteria.join(", ")}
                      </p>
                    ) : null}
                  </td>

                  <td className="px-3 py-3 align-top">
                    <AiCell
                      ai={row.ai}
                      row={row}
                      isExpanded={isExpanded}
                      onToggle={() => setExpanded(isExpanded ? null : row.id)}
                    />
                  </td>

                  <td className="px-3 py-3 align-top text-slate-600">
                    {row.appliedAt}
                  </td>

                  <td className="px-3 py-3 align-top">
                    <Badge tone={toneForApplicationStatus(row.status)}>
                      {labelFor(APPLICATION_STATUSES, row.status)}
                    </Badge>
                    {row.recruiterNotes ? (
                      <p className="mt-1 max-w-40 text-xs text-slate-500">
                        {row.recruiterNotes}
                      </p>
                    ) : null}
                  </td>

                  <td className="px-5 py-3 align-top">
                    <Link
                      href={`/recruiter/candidates/${row.candidate.id}`}
                      className="text-sm font-medium text-teal-700 hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>

                {isExpanded && row.ai ? (
                  <tr className="bg-slate-50">
                    <td />
                    <td colSpan={6} className="px-3 pb-4">
                      <AiDetail ai={row.ai} row={row} applicationId={row.id} />
                    </td>
                  </tr>
                ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </form>
  );
}
