import "server-only";

import { readUpload } from "@/lib/storage";
import type { ImageInput } from "@/lib/ai/azure-openai";

/**
 * How the resume content was obtained:
 * - PDF_TEXT: the PDF had an embedded text layer, extracted locally (no image
 *   sent to the model, cheapest path).
 * - VISION: the resume is an image file, passed to a vision-capable model.
 * - NONE: nothing readable could be produced.
 */
export type ExtractionMethod = "PDF_TEXT" | "VISION" | "NONE";

export type ExtractedResume =
  | { method: "PDF_TEXT"; text: string }
  | { method: "VISION"; image: ImageInput }
  | { method: "NONE"; reason: string };

const VISION_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Below this many characters we treat a PDF as scanned rather than digital —
 * a text layer of a few dozen characters is usually just a header or the
 * producer's watermark.
 */
const MIN_USABLE_TEXT_LENGTH = 250;

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  // Imported lazily: unpdf pulls in a pdf.js build that we don't want loaded
  // on requests that never screen a resume.
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join("\n") : text;
}

/**
 * Turns a stored resume document into something a model can read.
 *
 * PDFs are parsed locally first. A PDF with no usable text layer is a scan,
 * and rasterising PDF pages needs a native renderer we deliberately avoid on
 * App Service — so those are reported as NONE and surfaced to the recruiter as
 * "needs manual review" rather than being silently scored on no evidence.
 */
export async function extractResume(document: {
  storedName: string;
  mimeType: string;
}): Promise<ExtractedResume> {
  let bytes: Buffer;
  try {
    bytes = await readUpload(document.storedName);
  } catch {
    return { method: "NONE", reason: "The stored resume file could not be read." };
  }

  if (document.mimeType === "application/pdf") {
    let text = "";
    try {
      text = await extractPdfText(new Uint8Array(bytes));
    } catch {
      return { method: "NONE", reason: "The PDF could not be parsed." };
    }

    if (text.trim().length >= MIN_USABLE_TEXT_LENGTH) {
      return { method: "PDF_TEXT", text };
    }

    return {
      method: "NONE",
      reason:
        "This PDF has no text layer, so it is a scan. Scanned PDFs need to be reviewed by hand, or re-uploaded as an image or text-based PDF.",
    };
  }

  if (VISION_MIME_TYPES.has(document.mimeType)) {
    return {
      method: "VISION",
      image: { mimeType: document.mimeType, base64: bytes.toString("base64") },
    };
  }

  return {
    method: "NONE",
    reason: `Resumes of type ${document.mimeType} cannot be read automatically.`,
  };
}
