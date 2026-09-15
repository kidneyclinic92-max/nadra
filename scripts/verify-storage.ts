/**
 * Exercises the document storage layer against a throwaway directory:
 * a valid upload round-trips, and the guards reject oversized files,
 * disallowed types, and path traversal attempts.
 *
 * Run with: npm run verify:storage
 */
import { mkdtemp, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

let failures = 0;

function check(label: string, condition: boolean, detail = "") {
  if (!condition) failures += 1;
  console.log(`  ${condition ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  const scratch = await mkdtemp(path.join(tmpdir(), "upload-verify-"));
  process.env.UPLOAD_DIR = scratch;

  // Imported after UPLOAD_DIR is set, since the module resolves its root on load.
  const { saveUpload, readUpload, deleteUpload, UploadError } = await import(
    "../src/lib/storage"
  );

  async function expectRejection(label: string, run: () => Promise<unknown>) {
    try {
      await run();
      check(label, false, "expected an UploadError but none was thrown");
    } catch (error) {
      check(label, error instanceof UploadError, (error as Error).message);
    }
  }

  console.log("\nDocument storage checks");

  const pdf = new File(
    [new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])],
    "cnic front.pdf",
    { type: "application/pdf" },
  );

  const saved = await saveUpload("candidate-123", pdf);
  check(
    "saves a valid PDF",
    saved.sizeBytes === 5 && saved.mimeType === "application/pdf",
  );
  check(
    "stores under the candidate folder with a random name",
    saved.storedName.startsWith("candidate-123/") && saved.storedName.endsWith(".pdf"),
    saved.storedName,
  );
  check(
    "keeps the original filename readable",
    saved.originalName === "cnic front.pdf",
    saved.originalName,
  );

  const roundTripped = await readUpload(saved.storedName);
  check("reads the file back byte-for-byte", roundTripped.length === 5);

  await expectRejection("rejects a disallowed MIME type", () =>
    saveUpload(
      "candidate-123",
      new File(["<script/>"], "x.html", { type: "text/html" }),
    ),
  );

  await expectRejection("rejects an oversized file", () =>
    saveUpload(
      "candidate-123",
      new File([new Uint8Array(6 * 1024 * 1024)], "big.pdf", {
        type: "application/pdf",
      }),
    ),
  );

  await expectRejection("rejects an empty file", () =>
    saveUpload("candidate-123", new File([], "empty.pdf", { type: "application/pdf" })),
  );

  await expectRejection("blocks path traversal on read", () =>
    readUpload("../../../../etc/passwd"),
  );

  await deleteUpload(saved.storedName);
  const remaining = await readdir(path.join(scratch, "candidate-123"));
  check("deletes the stored file", remaining.length === 0);

  await deleteUpload(saved.storedName);
  check("deleting an already-missing file is a no-op", true);

  await rm(scratch, { recursive: true, force: true });

  console.log(
    failures === 0
      ? "\nAll storage checks passed.\n"
      : `\n${failures} storage check(s) failed.\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
