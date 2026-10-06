import "server-only";

/**
 * Screening input is redacted before it reaches the model.
 *
 * This is a public-sector hiring process: gender, domicile, quota category,
 * disability status, religion, marital status, age and name are all recorded
 * against a candidate, and none of them are permissible inputs to a relevance
 * score. Quota and domicile are applied by recruiters as separate, auditable
 * allocation rules — not blended into a model's judgement.
 *
 * Structured profile data is filtered by construction (see buildScreeningInput
 * in screen-resume.ts, which whitelists fields). Free-text resume content can
 * still leak identifiers, so it is scrubbed here.
 */

const CNIC = /\b\d{5}-?\d{7}-?\d\b/g;
const EMAIL = /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g;
// Pakistani mobile and landline shapes, plus generic long digit runs.
const PHONE = /(\+?92[\s-]?|\b0)(3\d{2}|\d{2,4})[\s-]?\d{6,8}\b/g;
const LONG_DIGITS = /\b\d{9,}\b/g;
const URL = /\bhttps?:\/\/\S+/gi;

export type RedactionReport = {
  text: string;
  /** Counts per category, useful for showing recruiters what was removed. */
  removed: Record<string, number>;
};

function replaceAndCount(
  text: string,
  pattern: RegExp,
  token: string,
): [string, number] {
  let count = 0;
  const next = text.replace(pattern, () => {
    count += 1;
    return token;
  });
  return [next, count];
}

/**
 * Strips direct identifiers from extracted resume text. Names are not removed —
 * they are unbounded free text and cannot be matched reliably — so the prompt
 * instructs the model to ignore them, and the candidate's stored name is never
 * sent alongside.
 */
export function redactResumeText(raw: string): RedactionReport {
  let text = raw;
  const removed: Record<string, number> = {};

  for (const [label, pattern, token] of [
    ["cnic", CNIC, "[CNIC REDACTED]"],
    ["email", EMAIL, "[EMAIL REDACTED]"],
    ["phone", PHONE, "[PHONE REDACTED]"],
    ["url", URL, "[URL REDACTED]"],
    ["id", LONG_DIGITS, "[ID REDACTED]"],
  ] as const) {
    const [next, count] = replaceAndCount(text, pattern, token);
    text = next;
    if (count > 0) removed[label] = count;
  }

  return { text, removed };
}

/**
 * Collapses whitespace and caps length. Resumes occasionally carry thousands of
 * lines of boilerplate, and an unbounded prompt is both a cost and a
 * truncation risk.
 */
export function normalizeResumeText(raw: string, maxChars = 12_000): string {
  const collapsed = raw
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return collapsed.length > maxChars
    ? `${collapsed.slice(0, maxChars)}\n\n[truncated]`
    : collapsed;
}
