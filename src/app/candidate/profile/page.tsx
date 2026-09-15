import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { toDateInputValue } from "@/lib/format";
import { Alert, PageHeader } from "@/components/ui";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Personal details" };

type SearchParams = Promise<{ welcome?: string }>;

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireRole("CANDIDATE");
  const { welcome } = await searchParams;

  const candidate = await prisma.candidate.findUnique({
    where: { userId: user.id },
  });

  const defaults = {
    fullName: candidate?.fullName ?? "",
    guardianName: candidate?.guardianName ?? "",
    guardianRelation: candidate?.guardianRelation ?? "FATHER",
    cnic: candidate?.cnic ?? "",
    dateOfBirth: toDateInputValue(candidate?.dateOfBirth),
    gender: candidate?.gender ?? "",
    maritalStatus: candidate?.maritalStatus ?? "",
    religion: candidate?.religion ?? "",
    nationality: candidate?.nationality ?? "Pakistani",
    mobile: candidate?.mobile ?? "",
    alternateMobile: candidate?.alternateMobile ?? "",
    contactEmail: candidate?.contactEmail ?? user.email,
    linkedinUrl: candidate?.linkedinUrl ?? "",
    portfolioUrl: candidate?.portfolioUrl ?? "",
    currentAddress: candidate?.currentAddress ?? "",
    permanentAddress: candidate?.permanentAddress ?? "",
    city: candidate?.city ?? "",
    province: candidate?.province ?? "",
    postalCode: candidate?.postalCode ?? "",
    domicileDistrict: candidate?.domicileDistrict ?? "",
    domicileProvince: candidate?.domicileProvince ?? "",
    quotaCategory: candidate?.quotaCategory ?? "OPEN_MERIT",
    hasDisability: candidate?.hasDisability ?? false,
    disabilityDetails: candidate?.disabilityDetails ?? "",
  };

  return (
    <>
      <PageHeader
        title="Personal details"
        description="These details are attached to every application you submit."
      />

      {welcome ? (
        <div className="mb-6">
          <Alert tone="success" title="Account created">
            Fill in the rest of your details below, then upload your documents.
          </Alert>
        </div>
      ) : null}

      <ProfileForm defaults={defaults} />
    </>
  );
}
