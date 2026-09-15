import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { readUpload } from "@/lib/storage";

/**
 * Candidate documents are identity records, so they are never served as static
 * files. Each request is authenticated and authorised: a candidate may read
 * only their own documents, while recruiters and admins may read any.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const document = await prisma.document.findUnique({
    where: { id },
    include: { candidate: { select: { userId: true } } },
  });

  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isStaff = user.role === "RECRUITER" || user.role === "ADMIN";
  const isOwner = document.candidate.userId === user.id;
  if (!isStaff && !isOwner) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let file: Buffer;
  try {
    file = await readUpload(document.storedName);
  } catch (error) {
    console.error("Failed to read stored document", document.id, error);
    return NextResponse.json({ error: "File unavailable" }, { status: 404 });
  }

  const filename = document.originalName.replace(/["\\]/g, "");

  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": document.mimeType,
      "Content-Length": String(file.byteLength),
      "Content-Disposition": `inline; filename="${filename}"`,
      // Uploads are user supplied: never let the browser guess a different
      // type, and keep them out of shared caches.
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cache-Control": "private, no-store",
    },
  });
}
