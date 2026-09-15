"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { errorState, successState, type ActionState } from "@/lib/form";
import { deleteUpload, saveUpload, UploadError } from "@/lib/storage";
import {
  documentUploadSchema,
  educationSchema,
  experienceSchema,
  fieldErrorsFrom,
  formDataToObject,
  profileSchema,
} from "@/lib/validation";

/** The fields an application cannot be assessed without. */
function isProfileComplete(profile: {
  fullName: string;
  guardianName: string;
  cnic: string;
  mobile: string;
  dateOfBirth: Date | null;
  gender: string | null;
  currentAddress: string | null;
  city: string | null;
  province: string | null;
  domicileProvince: string | null;
}): boolean {
  return Boolean(
    profile.fullName &&
      profile.guardianName &&
      profile.cnic &&
      profile.mobile &&
      profile.dateOfBirth &&
      profile.gender &&
      profile.currentAddress &&
      profile.city &&
      profile.province &&
      profile.domicileProvince,
  );
}

async function currentCandidate() {
  const user = await requireUser();
  const candidate = await prisma.candidate.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  return candidate;
}

export async function saveProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (user.role !== "CANDIDATE") {
    return errorState("Only candidates have a profile to edit.");
  }

  const parsed = profileSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return errorState(
      "Please correct the highlighted fields.",
      fieldErrorsFrom(parsed.error),
    );
  }

  const data = parsed.data;

  // CNIC uniquely identifies a candidate, so it must not collide with another
  // account even though the field stays editable for corrections.
  const cnicOwner = await prisma.candidate.findUnique({
    where: { cnic: data.cnic },
    select: { userId: true },
  });
  if (cnicOwner && cnicOwner.userId !== user.id) {
    return errorState("That CNIC is registered to another account.", {
      cnic: "This CNIC is already in use.",
    });
  }

  const values = {
    ...data,
    dateOfBirth: data.dateOfBirth ?? null,
    disabilityDetails: data.hasDisability ? (data.disabilityDetails ?? null) : null,
  };

  await prisma.candidate.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      ...values,
      isProfileComplete: isProfileComplete({
        ...values,
        dateOfBirth: values.dateOfBirth,
        gender: values.gender ?? null,
        currentAddress: values.currentAddress ?? null,
        city: values.city ?? null,
        province: values.province ?? null,
        domicileProvince: values.domicileProvince ?? null,
      }),
    },
    update: {
      ...values,
      isProfileComplete: isProfileComplete({
        ...values,
        dateOfBirth: values.dateOfBirth,
        gender: values.gender ?? null,
        currentAddress: values.currentAddress ?? null,
        city: values.city ?? null,
        province: values.province ?? null,
        domicileProvince: values.domicileProvince ?? null,
      }),
    },
  });

  revalidatePath("/candidate", "layout");
  return successState("Your profile has been saved.");
}

export async function saveEducationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const candidate = await currentCandidate();
  if (!candidate) return errorState("Complete your profile first.");

  const parsed = educationSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return errorState(
      "Please correct the highlighted fields.",
      fieldErrorsFrom(parsed.error),
    );
  }

  const educationId = String(formData.get("educationId") ?? "");
  const data = { ...parsed.data, candidateId: candidate.id };

  if (educationId) {
    // Scoped by candidateId so one candidate cannot edit another's record.
    const updated = await prisma.education.updateMany({
      where: { id: educationId, candidateId: candidate.id },
      data: parsed.data,
    });
    if (updated.count === 0) return errorState("Education record not found.");
  } else {
    await prisma.education.create({ data });
  }

  revalidatePath("/candidate/education");
  return successState(
    educationId ? "Education record updated." : "Education record added.",
  );
}

export async function deleteEducationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const candidate = await currentCandidate();
  if (!candidate) return errorState("Complete your profile first.");

  const id = String(formData.get("educationId") ?? "");
  const deleted = await prisma.education.deleteMany({
    where: { id, candidateId: candidate.id },
  });
  if (deleted.count === 0) return errorState("Education record not found.");

  revalidatePath("/candidate/education");
  return successState("Education record removed.");
}

export async function saveExperienceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const candidate = await currentCandidate();
  if (!candidate) return errorState("Complete your profile first.");

  const parsed = experienceSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return errorState(
      "Please correct the highlighted fields.",
      fieldErrorsFrom(parsed.error),
    );
  }

  const experienceId = String(formData.get("experienceId") ?? "");
  const values = {
    ...parsed.data,
    endDate: parsed.data.isCurrent ? null : (parsed.data.endDate ?? null),
  };

  if (experienceId) {
    const updated = await prisma.experience.updateMany({
      where: { id: experienceId, candidateId: candidate.id },
      data: values,
    });
    if (updated.count === 0) return errorState("Experience record not found.");
  } else {
    await prisma.experience.create({
      data: { ...values, candidateId: candidate.id },
    });
  }

  revalidatePath("/candidate/experience");
  return successState(
    experienceId ? "Experience record updated." : "Experience record added.",
  );
}

export async function deleteExperienceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const candidate = await currentCandidate();
  if (!candidate) return errorState("Complete your profile first.");

  const id = String(formData.get("experienceId") ?? "");
  const deleted = await prisma.experience.deleteMany({
    where: { id, candidateId: candidate.id },
  });
  if (deleted.count === 0) return errorState("Experience record not found.");

  revalidatePath("/candidate/experience");
  return successState("Experience record removed.");
}

export async function uploadDocumentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const candidate = await currentCandidate();
  if (!candidate) return errorState("Complete your profile first.");

  const parsed = documentUploadSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return errorState("Choose a valid document type.", fieldErrorsFrom(parsed.error));
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return errorState("Choose a file to upload.", { file: "No file selected." });
  }

  let saved;
  try {
    saved = await saveUpload(candidate.id, file);
  } catch (error) {
    if (error instanceof UploadError) {
      return errorState(error.message, { file: error.message });
    }
    console.error("Document upload failed", error);
    return errorState("The upload could not be completed. Please try again.");
  }

  const { type, label, educationId, experienceId } = parsed.data;

  // Single-instance documents such as the CNIC replace the previous file so a
  // recruiter never has to guess which of several scans is current.
  const singleInstance = ["PHOTO", "CNIC_FRONT", "CNIC_BACK", "DOMICILE", "RESUME"];
  if (singleInstance.includes(type)) {
    const previous = await prisma.document.findMany({
      where: { candidateId: candidate.id, type },
    });
    await prisma.document.deleteMany({
      where: { id: { in: previous.map((d) => d.id) } },
    });
    await Promise.all(previous.map((d) => deleteUpload(d.storedName)));
  }

  await prisma.document.create({
    data: {
      candidateId: candidate.id,
      type,
      label: label ?? null,
      educationId: educationId || null,
      experienceId: experienceId || null,
      ...saved,
    },
  });

  revalidatePath("/candidate/documents");
  return successState("Document uploaded.");
}

export async function deleteDocumentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const candidate = await currentCandidate();
  if (!candidate) return errorState("Complete your profile first.");

  const id = String(formData.get("documentId") ?? "");
  const document = await prisma.document.findFirst({
    where: { id, candidateId: candidate.id },
  });
  if (!document) return errorState("Document not found.");

  await prisma.document.delete({ where: { id: document.id } });
  await deleteUpload(document.storedName);

  revalidatePath("/candidate/documents");
  return successState("Document removed.");
}
