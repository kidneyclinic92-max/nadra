"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { updateApplicationStatusAction } from "@/lib/actions/applications";
import { idleState } from "@/lib/form";
import {
  APPLICATION_STATUSES,
  QUOTA_CATEGORIES,
  labelFor,
} from "@/lib/constants";
import {
  Alert,
  Badge,
  Input,
  Select,
  toneForApplicationStatus,
} from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export type ApplicantRow = {
  id: string;
  status: string;
  appliedAt: string;
  recruiterNotes: string | null;
  score: number;
  meetsAll: boolean;
  failedCriteria: string[];
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

export function ApplicantTable({ rows }: { rows: ApplicantRow[] }) {
  const [state, formAction] = useActionState(
    updateApplicationStatusAction,
    idleState,
  );
  const [selected, setSelected] = useState<string[]>([]);

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
                Match
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
              return (
                <tr
                  key={row.id}
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
              );
            })}
          </tbody>
        </table>
      </div>
    </form>
  );
}
