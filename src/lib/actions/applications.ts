"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { prisma } from "@/lib/db";
import { appBaseUrl, escapeHtml, sendEmail } from "@/lib/email";
import { requireStaff, requireUser } from "@/lib/auth";
import { errorState, successState, type ActionState } from "@/lib/form";
import { evaluateEligibility } from "@/lib/eligibility";
import { APPLICATION_STATUS_VALUES, isOneOf } from "@/lib/constants";
import { formatDateTime, isDeadlinePassed } from "@/lib/format";

async function sendApplicationReceivedEmail(details: {
  to: string;
  name: string;
  jobTitle: string;
  jobCode: string;
  submittedAt: Date;
}) {
  const greeting = details.name ? `Dear ${details.name},` : "Dear applicant,";
  const position = `${details.jobTitle} (${details.jobCode})`;
  const submitted = formatDateTime(details.submittedAt);
  const link = `${appBaseUrl()}/candidate/applications`;

  await sendEmail({
    to: details.to,
    subject: `Application received: ${details.jobTitle}`,
    text: [
      greeting,
      "",
      `Thank you for applying. We have received your application for ${position}, submitted on ${submitted}.`,
      "",
      "Our recruitment team will review it, and you'll be contacted if you are shortlisted.",
      `You can track its status at any time: ${link}`,
    ].join("\n"),
    html: `
      <p>${escapeHtml(greeting)}</p>
      <p>Thank you for applying. We have received your application for <strong>${escapeHtml(position)}</strong>, submitted on ${escapeHtml(submitted)}.</p>
      <p>Our recruitment team will review it, and you'll be contacted if you are shortlisted.</p>
      <p><a href="${link}" style="display:inline-block;padding:10px 18px;background:#0f766e;color:#fff;border-radius:6px;text-decoration:none">Track your application</a></p>
    `,
  });
}

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
  if (isDeadlinePassed(job.closingDate)) {
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
  if (!candidate.documents.some((document) => document.type === "RESUME")) {
    return errorState(
      "Upload your resume before applying. AI screening and recruiters both need it.",
    );
  }

  const existing = await prisma.application.findUnique({
    where: { jobId_candidateId: { jobId, candidateId: candidate.id } },
  });
  if (existing) return errorState("You have already applied for this position.");

  // Scored at submission time so the recruiter's applicant list can sort by fit
  // without recomputing every candidate on each page load.
  const { score } = evaluateEligibility(candidate, job);

  const application = await prisma.application.create({
    data: {
      jobId,
      candidateId: candidate.id,
      coverNote,
      eligibilityScore: score,
    },
  });

  after(async () => {
    try {
      await sendApplicationReceivedEmail({
        to: user.email,
        name: candidate.fullName,
        jobTitle: job.title,
        jobCode: job.code,
        submittedAt: application.appliedAt,
      });
    } catch (error) {
      console.error("Failed to send application confirmation email", error);
    }
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

const STRONG_MATCH_MIN = 80;

/**
 * After a batch AI run, shortlist every applicant whose resume scored as a
 * strong match. Does not reject anyone — weak scores stay for the recruiter
 * to review.
 */
export async function shortlistRecommendedAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireStaff();
  const jobId = String(formData.get("jobId") ?? "");
  if (!jobId) return errorState("Position not found.");

  const recommended = await prisma.application.findMany({
    where: {
      jobId,
      status: { notIn: ["SHORTLISTED", "REJECTED", "WITHDRAWN"] },
      screening: {
        status: "COMPLETED",
        matchScore: { gte: STRONG_MATCH_MIN },
      },
    },
    select: { id: true },
  });

  if (recommended.length === 0) {
    return errorState(
      "No strong matches to shortlist yet. Run AI screening first, then try again.",
    );
  }

  const result = await prisma.application.updateMany({
    where: { id: { in: recommended.map((row) => row.id) } },
    data: {
      status: "SHORTLISTED",
      reviewedById: user.id,
      reviewedAt: new Date(),
      recruiterNotes: `Shortlisted from AI screening (resume match ${STRONG_MATCH_MIN}%+).`,
    },
  });

  revalidatePath("/recruiter", "layout");
  revalidatePath(`/recruiter/jobs/${jobId}`);

  return successState(
    `Shortlisted ${result.count} strong match${result.count === 1 ? "" : "es"} from AI screening.`,
  );
}
