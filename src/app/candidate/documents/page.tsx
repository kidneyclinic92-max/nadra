import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { DOCUMENT_TYPES, MAX_UPLOAD_BYTES, formatBytes } from "@/lib/constants";
import { Alert, PageHeader } from "@/components/ui";
import { DocumentSlot } from "./document-slot";

export const metadata: Metadata = { title: "Documents" };

export default async function DocumentsPage() {
  const user = await requireRole("CANDIDATE");

  const candidate = await prisma.candidate.findUnique({
    where: { userId: user.id },
    select: {
      documents: { orderBy: { createdAt: "desc" } },
      educations: {
        select: { id: true, degreeTitle: true, passingYear: true },
        orderBy: { passingYear: "desc" },
      },
    },
  });

  const documents = (candidate?.documents ?? []).map((d) => ({
    id: d.id,
    type: d.type,
    label: d.label,
    originalName: d.originalName,
    mimeType: d.mimeType,
    sizeBytes: d.sizeBytes,
    isVerified: d.isVerified,
    educationId: d.educationId,
  }));

  const educationOptions = (candidate?.educations ?? []).map((e) => ({
    value: e.id,
    label: `${e.degreeTitle} (${e.passingYear})`,
  }));

  const missingRequired = DOCUMENT_TYPES.filter(
    (t) => t.required && !documents.some((d) => d.type === t.value),
  );

  return (
    <>
      <PageHeader
        title="Documents"
        description={`Accepted formats: PDF, JPG, PNG and WEBP, up to ${formatBytes(MAX_UPLOAD_BYTES)} per file.`}
      />

      <div className="mb-6">
        {missingRequired.length > 0 ? (
          <Alert tone="warning" title="Required documents missing">
            You still need to upload:{" "}
            {missingRequired.map((t) => t.label).join(", ")}.
          </Alert>
        ) : (
          <Alert tone="success" title="All required documents uploaded">
            Your document file is complete. You can still add supporting
            documents below.
          </Alert>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {DOCUMENT_TYPES.map((type) => (
          <DocumentSlot
            key={type.value}
            type={type.value}
            label={type.label}
            hint={type.hint}
            required={type.required}
            multiple={"multiple" in type ? type.multiple : false}
            documents={documents.filter((d) => d.type === type.value)}
            educationOptions={
              type.value === "EDUCATION_CERTIFICATE" ? educationOptions : []
            }
          />
        ))}
      </div>
    </>
  );
}
