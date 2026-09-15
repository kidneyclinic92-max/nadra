import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { EMPTY_JOB_DEFAULTS, JobForm } from "../job-form";

export const metadata: Metadata = { title: "Post a position" };

export default async function NewJobPage() {
  await requireStaff();

  return (
    <>
      <PageHeader
        title="Post a position"
        description="Save as a draft while you prepare it, then set the status to open to publish."
      />
      <JobForm defaults={EMPTY_JOB_DEFAULTS} />
    </>
  );
}
