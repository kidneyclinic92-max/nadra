import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  formatBytes,
} from "@/lib/constants";

/**
 * Uploads deliberately live outside `public/`. CNIC and domicile scans are
 * sensitive identity documents, so every read goes through an authenticated
 * route handler instead of being served as a static asset.
 */
// turbopackIgnore keeps the bundler from tracing the entire project just
// because this path is resolved at runtime; every read is still constrained to
// UPLOAD_ROOT by resolveUploadPath below.
const UPLOAD_ROOT = path.resolve(
  /*turbopackIgnore: true*/
  process.env.UPLOAD_DIR ?? path.join(process.cwd(), "storage", "uploads"),
);

const EXTENSION_BY_MIME: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export type SavedUpload = {
  storedName: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
};

export class UploadError extends Error {}

function assertAllowed(file: File): void {
  if (file.size === 0) {
    throw new UploadError("The selected file is empty.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadError(
      `File is ${formatBytes(file.size)}. The maximum allowed size is ${formatBytes(MAX_UPLOAD_BYTES)}.`,
    );
  }
  if (!ALLOWED_UPLOAD_MIME_TYPES.includes(file.type as never)) {
    throw new UploadError("Only PDF, JPG, PNG and WEBP files are accepted.");
  }
}

/** Keeps the display name readable while stripping anything path-like. */
function sanitizeOriginalName(name: string): string {
  const base = path.basename(name).replace(/[^\w.\- ]+/g, "_").trim();
  return base.slice(0, 120) || "document";
}

export async function saveUpload(
  candidateId: string,
  file: File,
): Promise<SavedUpload> {
  assertAllowed(file);

  // The stored filename is random and the extension comes from the verified
  // MIME type, so a user-supplied name can never influence the path on disk.
  const extension = EXTENSION_BY_MIME[file.type] ?? ".bin";
  const relativePath = path.posix.join(candidateId, `${randomUUID()}${extension}`);
  const absolutePath = resolveUploadPath(relativePath);

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));

  return {
    storedName: relativePath,
    originalName: sanitizeOriginalName(file.name),
    mimeType: file.type,
    sizeBytes: file.size,
  };
}

/**
 * Resolves a stored path and refuses anything that escapes the upload root,
 * which blocks `../` traversal even if a bad value reaches the database.
 */
function resolveUploadPath(storedName: string): string {
  const absolutePath = path.resolve(UPLOAD_ROOT, storedName);
  const rootWithSeparator = UPLOAD_ROOT.endsWith(path.sep)
    ? UPLOAD_ROOT
    : UPLOAD_ROOT + path.sep;

  if (!absolutePath.startsWith(rootWithSeparator)) {
    throw new UploadError("Invalid document path.");
  }
  return absolutePath;
}

export async function readUpload(storedName: string): Promise<Buffer> {
  return readFile(/*turbopackIgnore: true*/ resolveUploadPath(storedName));
}

export async function deleteUpload(storedName: string): Promise<void> {
  try {
    await unlink(resolveUploadPath(storedName));
  } catch (error) {
    // A missing file should not block deleting the database record.
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}
