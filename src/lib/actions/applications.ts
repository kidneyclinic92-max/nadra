"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireStaff, requireUser } from "@/lib/auth";
import { errorState, successState, type ActionState } from "@/lib/form";
import { evaluateEligibility } from "@/lib/eligibility";
import { APPLICATION_STATUS_VALUES, isOneOf } from "@/lib/constants";

export async function applyToJobAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (user.role !== "CANDIDATE") {
    return errorState("Only candidate accounts can apply for positions.");
  }

  const jobId = String(formData.get("jobId") ?? "");
  const coverNote = String(formData.get("coverNote") ?? "").trim() || null;

  const [candidate, job] = await Promise.all([
    prisma.candidate.findUnique({
      where: { userId: user.id },
      include: { educations: true, experiences: true, documents: true },
    }),
    prisma.job.findUnique({ where: { id: jobId } }),
  ]);

  if (!candidate) return errorState("Complete your profile before applying.");
  if (!job) return errorState("This position no longer exists.");
  if (job.status !== "OPEN") return errorState("This position is not accepting applications.");
  if (job.closingDate && job.closingDate.getTime() < Date.now()) {
    return errorState("The deadline for this position has passed.");
  }
  if (!candidate.isProfileComplete) {
    return errorState(
      "Your profile is incomplete. Fill in your personal details before applying.",
    );
  }
  if (candidate.educations.length === 0) {
    return errorState("Add at least one education record before applying.");
  }

  const existing = await prisma.application.findUnique({
    where: { jobId_candidateId: { jobId, candidateId: candidate.id } },
  });
  if (existing) return errorState("You have already applied for this position.");

  // Scored at submission time so the recruiter's applicant list can sort by fit
  // without recomputing every candidate on each page load.
  const { score } = evaluateEligibility(candidate, job);

  await prisma.application.create({
    data: {
      jobId,
      candidateId: candidate.id,
      coverNote,
      eligibilityScore: score,
    },
  });

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/candidate/applications");
  return successState("Your application has been submitted.");
}

export async function withdrawApplicationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const applicationId = String(formData.get("applicationId") ?? "");

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { candidate: { select: { userId: true } } },
  });

  if (!application || application.candidate.userId !== user.id) {
    return errorState("Application not found.");
  }
  if (application.status === "WITHDRAWN") {
    return errorState("This application has already been withdrawn.");
  }

  await prisma.application.update({
    where: { id: applicationId },
    data: { status: "WITHDRAWN" },
  });

  revalidatePath("/candidate/applications");
  return successState("Application withdrawn.");
}

/** Used by the recruiter shortlisting screen for both single and bulk actions. */
export async function updateApplicationStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireStaff();

  const status = String(formData.get("status") ?? "");
  const notes = String(formData.get("recruiterNotes") ?? "").trim() || undefined;
  const ids = formData
    .getAll("applicationIds")
    .map(String)
    .filter(Boolean);

  if (!isOneOf(APPLICATION_STATUS_VALUES, status)) {
    return errorState("Choose a valid status.");
  }
  if (ids.length === 0) {
    return errorState("Select at least one applicant first.");
  }

  const result = await prisma.application.updateMany({
    where: { id: { in: ids } },
    data: {
      status,
      reviewedById: user.id,
      reviewedAt: new Date(),
      ...(notes ? { recruiterNotes: notes } : {}),
    },
  });

  revalidatePath("/recruiter", "layout");

  const label = status.toLowerCase().replace("_", " ");
  return successState(
    `${result.count} applicant${result.count === 1 ? "" : "s"} marked as ${label}.`,
  );
}
