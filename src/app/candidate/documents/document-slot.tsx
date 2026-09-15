"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import {
  deleteDocumentAction,
  uploadDocumentAction,
} from "@/lib/actions/candidate";
import { idleState } from "@/lib/form";
import { MAX_UPLOAD_BYTES, formatBytes } from "@/lib/constants";
import { Alert, Badge, Card, Field, Input, Select } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ActionButton } from "@/components/action-button";

type DocumentRecord = {
  id: string;
  type: string;
  label: string | null;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  isVerified: boolean;
  educationId: string | null;
};

type Props = {
  type: string;
  label: string;
  hint: string;
  required: boolean;
  multiple: boolean;
  documents: DocumentRecord[];
  educationOptions: { value: string; label: string }[];
};

export function DocumentSlot({
  type,
  label,
  hint,
  required,
  multiple,
  documents,
  educationOptions,
}: Props) {
  const [state, formAction] = useActionState(uploadDocumentAction, idleState);
  const formRef = useRef<HTMLFormElement>(null);
  const [oversizeError, setOversizeError] = useState<string | null>(null);

  // Clear the file input after a successful upload so the slot is ready for
  // the next file rather than still showing the one just submitted.
  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state.status]);

  // An oversized file is rejected by the Server Action body parser before our
  // own validation runs, which surfaces as an opaque network error. Catch it
  // here so the candidate gets a useful message instead.
  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setOversizeError(
      file && file.size > MAX_UPLOAD_BYTES
        ? `That file is ${formatBytes(file.size)} — the limit is ${formatBytes(MAX_UPLOAD_BYTES)}.`
        : null,
    );
  }

  const hasDocuments = documents.length > 0;
  const canUpload = multiple || !hasDocuments;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900">{label}</h3>
            {required ? (
              <Badge tone={hasDocuments ? "success" : "warning"}>
                {hasDocuments ? "Uploaded" : "Required"}
              </Badge>
            ) : (
              <Badge tone="neutral">Optional</Badge>
            )}
          </div>
          <p className="mt-0.5 text-sm text-slate-500">{hint}</p>
        </div>
      </div>

      {hasDocuments ? (
        <ul className="mt-4 flex flex-col gap-2">
          {documents.map((document) => (
            <li
              key={document.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">
                  {document.label || document.originalName}
                </p>
                <p className="text-xs text-slate-500">
                  {formatBytes(document.sizeBytes)}
                  {document.isVerified ? " · Verified" : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <a
                  href={`/api/documents/${document.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  View
                </a>
                <ActionButton
                  action={deleteDocumentAction}
                  fields={{ documentId: document.id }}
                  variant="ghost"
                  size="sm"
                  confirm={`Remove ${document.originalName}?`}
                  pendingLabel="Removing…"
                >
                  Remove
                </ActionButton>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <form ref={formRef} action={formAction} className="mt-4 flex flex-col gap-3">
        <input type="hidden" name="type" value={type} />

        {state.status === "error" && state.message ? (
          <Alert tone="danger">{state.message}</Alert>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field
            label={
              canUpload
                ? hasDocuments
                  ? "Add another file"
                  : "Choose a file"
                : "Replace this file"
            }
            name={`file-${type}`}
            error={oversizeError ?? state.errors?.file}
          >
            <Input
              id={`file-${type}`}
              name="file"
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              required
              onChange={handleFileChange}
              error={oversizeError ?? undefined}
              className="file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-700"
            />
          </Field>
          <SubmitButton
            variant="secondary"
            pendingLabel="Uploading…"
            disabled={oversizeError !== null}
          >
            Upload
          </SubmitButton>
        </div>

        {multiple ? (
          <Field
            label="Description"
            name={`label-${type}`}
            hint="Optional — helps recruiters identify the file."
          >
            <Input
              id={`label-${type}`}
              name="label"
              placeholder="e.g. BS transcript, final year"
            />
          </Field>
        ) : null}

        {educationOptions.length > 0 ? (
          <Field
            label="Link to qualification"
            name={`educationId-${type}`}
            hint="Optional — attaches this certificate to a specific degree."
          >
            <Select
              id={`educationId-${type}`}
              name="educationId"
              options={educationOptions}
              placeholder="Not linked"
            />
          </Field>
        ) : null}

        {!canUpload ? (
          <p className="text-xs text-slate-500">
            Uploading a new file will replace the one above.
          </p>
        ) : null}
      </form>
    </Card>
  );
}
