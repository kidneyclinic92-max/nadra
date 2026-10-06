"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { errorState, successState, type ActionState } from "@/lib/form";
import { AiConfigError, isScreeningConfigured } from "@/lib/ai/azure-openai";
import { PROMPT_VERSION, screenResume, type JobCriteria } from "@/lib/ai/screen-resume";

/**
 * Applications screened per action call. Kept small so each request finishes
 * well inside the platform's timeout; the client re-invokes until the queue is
 * drained, which also gives the recruiter visible progress.
 */
const BATCH_SIZE = 5;

/** Concurrent model calls within a batch. */
const CONCURRENCY = 3;

const JOB_FIELDS = {
  title: true,
  department: true,
  description: true,
  responsibilities: true,
  minEducationLevel: true,
  requiredDegreeTitle: true,
  minExperienceYears: true,
  requiredSkills: true,
} as const;

export type ScreeningProgress = {
  status: "ok" | "error";
  message?: string;
  /** Applications still lacking a completed screening for this job. */
  remaining: number;
  /** Screened successfully in this batch only; the caller accumulates. */
  processed: number;
  failed: number;
  total: number;
};

async function mapWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor++];
      await worker(item);
    }
  });
  await Promise.all(runners);
}

/**
 * Screens one application and records the outcome. Never throws: every failure
 * mode is persisted on the screening row so the recruiter can see what
 * happened and retry that candidate specifically.
 */
async function screenOne(
  application: {
    id: string;
    candidate: { documents: { id: string; storedName: string; mimeType: string }[] };
  },
  job: JobCriteria,
): Promise<"completed" | "failed"> {
  // The most recently uploaded resume is the one assessed.
  const resume = application.candidate.documents[0];

  if (!resume) {
    await prisma.resumeScreening.upsert({
      where: { applicationId: application.id },
      create: {
        applicationId: application.id,
        status: "NEEDS_MANUAL_REVIEW",
        extractionMethod: "NONE",
        promptVersion: PROMPT_VERSION,
        error: "This candidate has not uploaded a resume.",
        scannedAt: new Date(),
      },
      update: {
        status: "NEEDS_MANUAL_REVIEW",
        extractionMethod: "NONE",
        promptVersion: PROMPT_VERSION,
        error: "This candidate has not uploaded a resume.",
        matchScore: null,
        recommendation: null,
        summary: null,
        strengths: null,
        gaps: null,
        matchedSkills: null,
        missingSkills: null,
        parameters: null,
        confidence: null,
        scannedAt: new Date(),
      },
    });
    return "failed";
  }

  try {
    const outcome = await screenResume({ job, resume });

    const shared = {
      resumeDocumentId: resume.id,
      promptVersion: PROMPT_VERSION,
      scannedAt: new Date(),
    };

    const data =
      outcome.status === "COMPLETED"
        ? {
            ...shared,
            status: "COMPLETED",
            matchScore: outcome.assessment.matchScore,
            recommendation: outcome.assessment.recommendation,
            summary: outcome.assessment.summary,
            strengths: JSON.stringify(outcome.assessment.strengths),
            gaps: JSON.stringify(outcome.assessment.gaps),
            matchedSkills: JSON.stringify(outcome.assessment.matchedSkills),
            missingSkills: JSON.stringify(outcome.assessment.missingSkills),
            parameters: JSON.stringify(outcome.assessment.parameters),
            confidence: outcome.assessment.confidence,
            extractionMethod: outcome.extractionMethod,
            modelName: outcome.modelName,
            inputTokens: outcome.inputTokens,
            outputTokens: outcome.outputTokens,
            error: null,
          }
        : {
            ...shared,
            status: "NEEDS_MANUAL_REVIEW",
            extractionMethod: outcome.extractionMethod,
            error: outcome.reason,
            matchScore: null,
            recommendation: null,
            summary: null,
            strengths: null,
            gaps: null,
            matchedSkills: null,
            missingSkills: null,
            parameters: null,
            confidence: null,
          };

    await prisma.resumeScreening.upsert({
      where: { applicationId: application.id },
      create: { applicationId: application.id, ...data },
      update: data,
    });

    return outcome.status === "COMPLETED" ? "completed" : "failed";
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Screening failed unexpectedly.";

    await prisma.resumeScreening.upsert({
      where: { applicationId: application.id },
      create: {
        applicationId: application.id,
        status: "FAILED",
        resumeDocumentId: resume.id,
        promptVersion: PROMPT_VERSION,
        error: message,
        scannedAt: new Date(),
      },
      update: {
        status: "FAILED",
        resumeDocumentId: resume.id,
        promptVersion: PROMPT_VERSION,
        error: message,
        scannedAt: new Date(),
      },
    });

    return "failed";
  }
}

/**
 * Screens the next batch of unscreened applicants for a job. Call repeatedly
 * until `remaining` is zero. Applications already screened are skipped, so
 * re-running after new candidates apply only costs the new ones.
 *
 * Deliberately does not revalidate: the caller loops on this, and refreshing
 * the route mid-loop would remount the panel driving it. The client refreshes
 * once the queue is drained.
 */
export async function runJobScreeningAction(
  jobId: string,
): Promise<ScreeningProgress> {
  await requireStaff();

  const empty = { remaining: 0, processed: 0, failed: 0, total: 0 };

  if (!isScreeningConfigured()) {
    return {
      ...empty,
      status: "error",
      message:
        "AI screening is not configured. Set the Azure OpenAI environment variables to enable it.",
    };
  }

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: JOB_FIELDS,
  });
  if (!job) return { ...empty, status: "error", message: "Position not found." };

  const total = await prisma.application.count({
    where: { jobId, status: { not: "WITHDRAWN" } },
  });

  // Anything without a completed screening is eligible, which means failures
  // and manual-review rows are retried on the next run.
  const pendingWhere = {
    jobId,
    status: { not: "WITHDRAWN" },
    OR: [{ screening: { is: null } }, { screening: { status: { not: "COMPLETED" } } }],
  };

  const batch = await prisma.application.findMany({
    where: pendingWhere,
    orderBy: { appliedAt: "asc" },
    take: BATCH_SIZE,
    select: {
      id: true,
      candidate: {
        select: {
          documents: {
            where: { type: "RESUME" },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { id: true, storedName: true, mimeType: true },
          },
        },
      },
    },
  });

  let processed = 0;
  let failed = 0;

  try {
    await mapWithConcurrency(batch, CONCURRENCY, async (application) => {
      const result = await screenOne(application, job);
      if (result === "completed") processed += 1;
      else failed += 1;
    });
  } catch (error) {
    if (error instanceof AiConfigError) {
      return { ...empty, total, status: "error", message: error.message };
    }
    throw error;
  }

  const remaining = await prisma.application.count({ where: pendingWhere });

  return { status: "ok", remaining, processed, failed, total };
}

/** Re-screens a single applicant, e.g. after they upload a better resume. */
export async function rescreenApplicationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireStaff();

  const applicationId = String(formData.get("applicationId") ?? "");

  if (!isScreeningConfigured()) {
    return errorState("AI screening is not configured.");
  }

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      jobId: true,
      job: { select: JOB_FIELDS },
      candidate: {
        select: {
          documents: {
            where: { type: "RESUME" },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { id: true, storedName: true, mimeType: true },
          },
        },
      },
    },
  });

  if (!application) return errorState("Application not found.");

  const result = await screenOne(application, application.job);

  revalidatePath(`/recruiter/jobs/${application.jobId}`);

  return result === "completed"
    ? successState("Resume re-screened.")
    : errorState("This resume could not be screened. See the reason on the row.");
}
