"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { errorState, successState, type ActionState } from "@/lib/form";
import { fieldErrorsFrom, formDataToObject, jobSchema } from "@/lib/validation";

export async function saveJobAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireStaff();

  const parsed = jobSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return errorState(
      "Please correct the highlighted fields.",
      fieldErrorsFrom(parsed.error),
    );
  }

  const jobId = String(formData.get("jobId") ?? "");
  const data = parsed.data;

  const codeOwner = await prisma.job.findUnique({
    where: { code: data.code },
    select: { id: true },
  });
  if (codeOwner && codeOwner.id !== jobId) {
    return errorState("That job code is already in use.", {
      code: "Another position already uses this code.",
    });
  }

  const values = {
    ...data,
    closingDate: data.closingDate ?? null,
    minAge: data.minAge ?? null,
    maxAge: data.maxAge ?? null,
  };

  if (jobId) {
    await prisma.job.update({ where: { id: jobId }, data: values });
  } else {
    const created = await prisma.job.create({
      data: { ...values, createdById: user.id },
    });
    revalidatePath("/recruiter/jobs");
    redirect(`/recruiter/jobs/${created.id}`);
  }

  revalidatePath("/recruiter/jobs");
  revalidatePath(`/recruiter/jobs/${jobId}`);
  revalidatePath(`/jobs/${jobId}`);
  return successState("Position saved.");
}

export async function setJobStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireStaff();

  const jobId = String(formData.get("jobId") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!["DRAFT", "OPEN", "CLOSED"].includes(status)) {
    return errorState("Choose a valid status.");
  }

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true },
  });
  if (!job) return errorState("Position not found.");

  await prisma.job.update({ where: { id: jobId }, data: { status } });

  revalidatePath("/recruiter/jobs");
  revalidatePath(`/recruiter/jobs/${jobId}`);
  revalidatePath("/jobs");
  return successState(`Position marked as ${status.toLowerCase()}.`);
}

export async function deleteJobAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireStaff();

  const jobId = String(formData.get("jobId") ?? "");
  const applicationCount = await prisma.application.count({ where: { jobId } });

  // Deleting would cascade away the applicants' history, so a position that has
  // been applied to can only be closed.
  if (applicationCount > 0) {
    return errorState(
      `This position has ${applicationCount} application${applicationCount === 1 ? "" : "s"}. Close it instead of deleting it.`,
    );
  }

  await prisma.job.delete({ where: { id: jobId } });

  revalidatePath("/recruiter/jobs");
  redirect("/recruiter/jobs");
}
