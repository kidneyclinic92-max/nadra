"use client";

import { useActionState } from "react";
import { applyToJobAction } from "@/lib/actions/applications";
import { idleState } from "@/lib/form";
import type { EligibilityResult } from "@/lib/eligibility";
import {
  Alert,
  Badge,
  Card,
  CardBody,
  CardHeader,
  Field,
  LinkButton,
  Textarea,
  toneForApplicationStatus,
} from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { APPLICATION_STATUSES, labelFor } from "@/lib/constants";

type Props = {
  jobId: string;
  isSignedIn: boolean;
  isCandidate: boolean;
  isProfileComplete: boolean;
  existingApplication: { id: string; status: string; appliedAt: Date } | null;
  eligibility: EligibilityResult | null;
};

export function ApplyPanel({
  jobId,
  isSignedIn,
  isCandidate,
  isProfileComplete,
  existingApplication,
  eligibility,
}: Props) {
  const [state, formAction] = useActionState(applyToJobAction, idleState);

  if (!isSignedIn) {
    return (
      <Card>
        <CardHeader
          title="Apply for this position"
          description="Sign in or create a candidate account to apply."
        />
        <CardBody className="flex flex-col gap-2">
          <LinkButton href="/register" className="w-full">
            Create an account
          </LinkButton>
          <LinkButton href="/login" variant="secondary" className="w-full">
            Sign in
          </LinkButton>
        </CardBody>
      </Card>
    );
  }

  if (!isCandidate) {
    return (
      <Alert tone="info" title="Recruiter account">
        You are signed in as staff. Only candidate accounts can submit
        applications.
      </Alert>
    );
  }

  if (existingApplication) {
    return (
      <Card>
        <CardHeader title="Application submitted" />
        <CardBody className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Current status</span>
            <Badge tone={toneForApplicationStatus(existingApplication.status)}>
              {labelFor(APPLICATION_STATUSES, existingApplication.status)}
            </Badge>
          </div>
          <LinkButton
            href="/candidate/applications"
            variant="secondary"
            className="w-full"
          >
            Track your applications
          </LinkButton>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title="Apply for this position" />
      <CardBody className="flex flex-col gap-4">
        {eligibility && eligibility.checks.length > 0 ? (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">
                How you match
              </span>
              <Badge
                tone={
                  eligibility.meetsAll
                    ? "success"
                    : eligibility.score >= 50
                      ? "warning"
                      : "danger"
                }
              >
                {eligibility.score}%
              </Badge>
            </div>
            <ul className="flex flex-col gap-1.5">
              {eligibility.checks.map((check) => (
                <li key={check.label} className="flex items-start gap-2 text-sm">
                  <span
                    aria-hidden
                    className={
                      check.passed
                        ? "mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-500"
                        : "mt-1.5 size-1.5 shrink-0 rounded-full bg-red-500"
                    }
                  />
                  <span>
                    <span className="font-medium text-slate-800">
                      {check.label}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {check.detail}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            {!eligibility.meetsAll ? (
              <p className="mt-3 text-xs text-slate-500">
                You may still apply. Recruiters review every application and may
                relax criteria where the rules allow.
              </p>
            ) : null}
          </div>
        ) : null}

        {!isProfileComplete ? (
          <Alert tone="warning" title="Complete your profile first">
            <p className="mt-1">
              Your personal details are incomplete, so your application cannot be
              submitted yet.
            </p>
            <LinkButton href="/candidate/profile" size="sm" className="mt-3">
              Complete profile
            </LinkButton>
          </Alert>
        ) : (
          <form action={formAction} className="flex flex-col gap-3">
            <input type="hidden" name="jobId" value={jobId} />

            {state.status === "error" && state.message ? (
              <Alert tone="danger">{state.message}</Alert>
            ) : null}
            {state.status === "success" && state.message ? (
              <Alert tone="success">{state.message}</Alert>
            ) : null}

            <Field
              label="Cover note"
              name="coverNote"
              hint="Optional — a short note to the recruiter."
            >
              <Textarea
                name="coverNote"
                rows={4}
                maxLength={1500}
                placeholder="Why you are a good fit for this role"
              />
            </Field>

            <SubmitButton
              className="w-full"
              pendingLabel="Submitting…"
              disabled={state.status === "success"}
            >
              Submit application
            </SubmitButton>
          </form>
        )}
      </CardBody>
    </Card>
  );
}
