"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bot, Loader2, ShieldAlert, Sparkles } from "lucide-react";
import { runJobScreeningAction } from "@/lib/actions/ai-screening";
import { SCREENING_RECOMMENDATIONS } from "@/lib/constants";
import { Alert, Button, Card, CardBody, CardHeader } from "@/components/ui";

const BAND_DOTS: Record<string, string> = {
  STRONG_MATCH: "bg-emerald-500",
  POSSIBLE_MATCH: "bg-amber-400",
  WEAK_MATCH: "bg-slate-300",
};

type Props = {
  jobId: string;
  configured: boolean;
  /** Applicants with no completed screening yet. */
  unscreened: number;
  screened: number;
  total: number;
  /** Completed screenings per recommendation band. */
  bandCounts: Record<string, number>;
  /** Screened but unreadable, so carrying no score. */
  needsReview: number;
};

type RunState = {
  phase: "idle" | "running" | "done";
  processed: number;
  failed: number;
  remaining: number;
  error?: string;
};

export function ScreeningPanel({
  jobId,
  configured,
  unscreened,
  screened,
  total,
  bandCounts,
  needsReview,
}: Props) {
  const router = useRouter();
  const [run, setRun] = useState<RunState>({
    phase: "idle",
    processed: 0,
    failed: 0,
    remaining: unscreened,
  });

  /**
   * The action screens one batch per call, keeping each request short. Looping
   * here rather than server-side means the recruiter sees progress and can
   * navigate away without killing a long request.
   */
  async function start() {
    setRun({ phase: "running", processed: 0, failed: 0, remaining: unscreened });

    let processed = 0;
    let failed = 0;

    try {
      for (;;) {
        const batch = await runJobScreeningAction(jobId);

        if (batch.status === "error") {
          setRun({
            phase: "done",
            processed,
            failed,
            remaining: batch.remaining,
            error: batch.message,
          });
          return;
        }

        processed += batch.processed;
        failed += batch.failed;
        setRun({
          phase: batch.remaining > 0 ? "running" : "done",
          processed,
          failed,
          remaining: batch.remaining,
        });

        if (batch.remaining === 0) break;
      }
    } catch {
      setRun({
        phase: "done",
        processed,
        failed,
        remaining: unscreened - processed - failed,
        error: "Screening stopped unexpectedly. Any completed scores were saved.",
      });
      return;
    }

    // Pull the newly written scores into the applicant table.
    router.refresh();
  }

  const isRunning = run.phase === "running";
  const pending = isRunning ? run.remaining : unscreened;
  const completedNow = total - pending;
  const percent = total === 0 ? 0 : Math.round((completedNow / total) * 100);

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <Bot className="size-4 text-teal-600" />
            AI resume screening
          </span>
        }
        description="Scores each resume against qualification, field of study, experience, required skills and role relevance, with a quote from the resume for each. Advisory only — it never changes an application's status."
        action={
          configured ? (
            <Button
              type="button"
              size="sm"
              onClick={start}
              disabled={isRunning || unscreened === 0}
            >
              {isRunning ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Screening…
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  {screened > 0 ? "Screen new applicants" : "Run AI screening"}
                </>
              )}
            </Button>
          ) : null
        }
      />

      <CardBody className="flex flex-col gap-4">
        {!configured ? (
          <Alert tone="warning" title="Not configured">
            Set <code className="font-mono text-xs">AZURE_OPENAI_ENDPOINT</code>,{" "}
            <code className="font-mono text-xs">AZURE_OPENAI_API_KEY</code> and{" "}
            <code className="font-mono text-xs">AZURE_OPENAI_DEPLOYMENT</code> to
            enable resume screening.
          </Alert>
        ) : (
          <>
            {run.error ? <Alert tone="danger">{run.error}</Alert> : null}

            <div className="grid grid-cols-3 gap-4">
              <Metric label="Applicants" value={total} />
              <Metric label="Screened" value={completedNow} />
              <Metric label="Not screened" value={pending} muted />
            </div>

            {isRunning ? (
              <div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-[width] duration-500"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {pending} remaining. Scores are saved as each batch finishes.
                </p>
              </div>
            ) : null}

            {run.phase === "done" && !run.error ? (
              <Alert tone={run.failed > 0 ? "warning" : "success"}>
                Screened {run.processed} resume{run.processed === 1 ? "" : "s"}.
                {run.failed > 0
                  ? ` ${run.failed} could not be read and need manual review.`
                  : ""}
              </Alert>
            ) : null}

            {screened > 0 && !isRunning ? (
              <div className="border-t border-slate-200 pt-3">
                <p className="text-xs tracking-wide text-slate-500 uppercase">
                  {screened === 1
                    ? "How the 1 scored resume was banded"
                    : `How the ${screened} scored resumes were banded`}
                </p>

                <dl className="mt-2 flex flex-col gap-1.5">
                  {SCREENING_RECOMMENDATIONS.map((band) => {
                    const count = bandCounts[band.value] ?? 0;
                    return (
                      <div
                        key={band.value}
                        className="flex flex-wrap items-baseline gap-x-2 text-xs"
                      >
                        <dt className="flex w-36 shrink-0 items-center gap-1.5">
                          <span
                            className={`size-2 shrink-0 rounded-full ${BAND_DOTS[band.value]}`}
                          />
                          <span className="font-medium text-slate-700">
                            {band.label}
                          </span>
                          <span className="tabular-nums text-slate-400">
                            {band.min}–{band.max}
                          </span>
                        </dt>
                        <dd className="text-slate-500">
                          <span className="font-semibold tabular-nums text-slate-900">
                            {count}
                          </span>{" "}
                          — {band.guidance}
                        </dd>
                      </div>
                    );
                  })}

                  {needsReview > 0 ? (
                    <div className="flex flex-wrap items-baseline gap-x-2 text-xs">
                      <dt className="flex w-36 shrink-0 items-center gap-1.5">
                        <span className="size-2 shrink-0 rounded-full bg-amber-400" />
                        <span className="font-medium text-slate-700">
                          Needs manual review
                        </span>
                      </dt>
                      <dd className="text-slate-500">
                        <span className="font-semibold tabular-nums text-slate-900">
                          {needsReview}
                        </span>{" "}
                        — the resume could not be read, so no score was given
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            ) : null}

            <p className="flex items-start gap-2 border-t border-slate-200 pt-3 text-xs text-slate-500">
              <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
              <span>
                Name, CNIC, gender, age, domicile, quota category and disability
                status are removed before a resume is sent for scoring, and are not
                used to rank candidates. Scores are a reading aid — verify
                documents before shortlisting.
              </span>
            </p>
          </>
        )}
      </CardBody>
    </Card>
  );
}

function Metric({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: number;
  muted?: boolean;
}) {
  return (
    <div>
      <p className="text-xs tracking-wide text-slate-500 uppercase">{label}</p>
      <p
        className={`mt-0.5 text-2xl font-semibold tabular-nums ${
          muted ? "text-slate-400" : "text-slate-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
