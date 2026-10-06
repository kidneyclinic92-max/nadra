import "server-only";

import { z } from "zod";
import { completeJson, type ImageInput } from "@/lib/ai/azure-openai";
import { normalizeResumeText, redactResumeText } from "@/lib/ai/redact";
import { extractResume } from "@/lib/ai/resume-text";
import {
  EDUCATION_LEVELS,
  SCREENING_PARAMETERS,
  SCREENING_PARAMETER_VALUES,
  SCREENING_RECOMMENDATIONS,
  labelFor,
  recommendationFromScore,
  scoreFromParameters,
  type ScreeningConfidence,
  type ScreeningParameterResult,
} from "@/lib/constants";
import type { ExtractionMethod } from "@/lib/ai/resume-text";

/**
 * Bump when the prompt or schema changes so stored scores remain traceable to
 * the instructions that produced them.
 */
export const PROMPT_VERSION = "2026-10-07.1";

/**
 * Generated from SCREENING_RECOMMENDATIONS so the bands the model is scored
 * against are literally the same ones the recruiter UI explains.
 */
const SCORING_GUIDANCE = SCREENING_RECOMMENDATIONS.map(
  (band) => `- ${band.min}-${band.max} ${band.value}: ${band.guidance}.`,
).join("\n");

const PARAMETER_GUIDANCE = SCREENING_PARAMETERS.map(
  (p) =>
    `- ${p.value} (weight ${p.weight}% of the overall score): ${p.description}`,
).join("\n");

const SYSTEM_PROMPT = `You assess how well a candidate's resume matches a job description for a public sector recruitment portal in Pakistan.

Your output is advisory. A human recruiter makes every hiring decision; you never decide.

You score exactly these parameters, and only these:
${PARAMETER_GUIDANCE}

Rules you must follow:
- Judge only job-relevant evidence: qualifications, field of study, skills, responsibilities held, and length and relevance of experience.
- Ignore any personal identifiers that appear in the resume text: names, gender, age, date of birth, marital status, religion, caste, nationality, domicile, home address, photographs, and quota or disability status. These are not permissible inputs to a relevance score. Do not mention them and do not let them influence any score.
- Base every finding strictly on what the resume evidences. Do not infer or invent employers, degrees, dates or skills that are not stated.
- For each parameter, put a short quote or close paraphrase from the resume in "evidence". If the resume is silent, evidence must be exactly: Not stated in the resume.
- If the job did not advertise a criterion (no minimum qualification, no field of study, no minimum experience, or no required skills), that parameter's verdict is NOT_APPLICABLE, its score is 0, and its evidence is: Not advertised for this post. ROLE_FIT is always assessed against the job description.
- If the resume is thin or unreadable, set confidence to LOW, say so in the summary, and score conservatively rather than guessing.

Verdicts:
- MET: the resume clearly evidences the advertised requirement.
- PARTIAL: some relevant evidence, but a real gap remains.
- NOT_EVIDENCED: the resume does not support the advertised requirement.
- NOT_APPLICABLE: the job did not advertise this criterion.

Scoring guidance for each parameter score and for matchScore (0-100):
${SCORING_GUIDANCE}

matchScore should reflect the same evidence as the parameter scores. A recruiter will see both.`;

const PARAMETER_ITEM_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["id", "verdict", "score", "requirement", "evidence", "finding"],
  properties: {
    id: {
      type: "string",
      enum: [...SCREENING_PARAMETER_VALUES],
    },
    verdict: {
      type: "string",
      enum: ["MET", "PARTIAL", "NOT_EVIDENCED", "NOT_APPLICABLE"],
    },
    score: {
      type: "integer",
      minimum: 0,
      maximum: 100,
      description: "0 when NOT_APPLICABLE.",
    },
    requirement: {
      type: "string",
      description: "The advertised criterion this parameter is scoring, or 'Not advertised'.",
    },
    evidence: {
      type: "string",
      description:
        "A short quote or close paraphrase from the resume. 'Not stated in the resume' if silent.",
    },
    finding: {
      type: "string",
      description: "One or two sentences a recruiter can verify against the evidence.",
    },
  },
} as const;

const RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "confidence",
    "summary",
    "parameters",
    "strengths",
    "gaps",
    "matchedSkills",
    "missingSkills",
  ],
  properties: {
    confidence: {
      type: "string",
      enum: ["HIGH", "MEDIUM", "LOW"],
      description:
        "HIGH when evidence is explicit; LOW when the resume is thin or hard to read.",
    },
    summary: {
      type: "string",
      description:
        "Two or three sentences on how the resume relates to the requirements, for a recruiter to read.",
    },
    parameters: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: PARAMETER_ITEM_SCHEMA,
      description:
        "One object for each of EDUCATION, FIELD_OF_STUDY, EXPERIENCE, SKILLS, ROLE_FIT, in that order.",
    },
    strengths: {
      type: "array",
      items: { type: "string" },
      description: "Job-relevant evidence found in the resume.",
    },
    gaps: {
      type: "array",
      items: { type: "string" },
      description: "Stated requirements the resume does not evidence.",
    },
    matchedSkills: { type: "array", items: { type: "string" } },
    missingSkills: { type: "array", items: { type: "string" } },
  },
} as const;

const parameterSchema = z.object({
  id: z.enum(SCREENING_PARAMETER_VALUES),
  verdict: z.enum(["MET", "PARTIAL", "NOT_EVIDENCED", "NOT_APPLICABLE"]),
  score: z.number().int().min(0).max(100),
  requirement: z.string().trim().min(1),
  evidence: z.string().trim().min(1),
  finding: z.string().trim().min(1),
});

const resultSchema = z.object({
  confidence: z.enum(["HIGH", "MEDIUM", "LOW"]),
  summary: z.string().trim().min(1),
  parameters: z.array(parameterSchema).min(1).max(5),
  strengths: z.array(z.string().trim().min(1)).max(10),
  gaps: z.array(z.string().trim().min(1)).max(10),
  matchedSkills: z.array(z.string().trim().min(1)).max(30),
  missingSkills: z.array(z.string().trim().min(1)).max(30),
});

export type ScreeningAssessment = {
  matchScore: number;
  recommendation: "STRONG_MATCH" | "POSSIBLE_MATCH" | "WEAK_MATCH";
  confidence: ScreeningConfidence;
  summary: string;
  parameters: ScreeningParameterResult[];
  strengths: string[];
  gaps: string[];
  matchedSkills: string[];
  missingSkills: string[];
};

/** Stored parameter JSON is parsed defensively so a malformed row cannot take down the list. */
export function parseStoredParameters(
  raw: string | null | undefined,
): ScreeningParameterResult[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const results: ScreeningParameterResult[] = [];
    const seen = new Set<string>();
    for (const item of parsed) {
      const result = parameterSchema.safeParse(item);
      if (!result.success || seen.has(result.data.id)) continue;
      seen.add(result.data.id);
      results.push(result.data);
    }
    return SCREENING_PARAMETERS.map((p) =>
      results.find((r) => r.id === p.value),
    ).filter((p): p is ScreeningParameterResult => p !== undefined);
  } catch {
    return [];
  }
}

function toAssessment(
  parsed: z.infer<typeof resultSchema>,
): ScreeningAssessment {
  const byId = new Map(parsed.parameters.map((p) => [p.id, p]));
  const parameters = SCREENING_PARAMETERS.map((spec) => byId.get(spec.value)).filter(
    (p): p is ScreeningParameterResult => p !== undefined,
  );

  const matchScore = scoreFromParameters(parameters);
  return {
    matchScore,
    recommendation: recommendationFromScore(matchScore),
    confidence: parsed.confidence,
    summary: parsed.summary,
    parameters,
    strengths: parsed.strengths,
    gaps: parsed.gaps,
    matchedSkills: parsed.matchedSkills,
    missingSkills: parsed.missingSkills,
  };
}

export type JobCriteria = {
  title: string;
  department: string | null;
  description: string;
  responsibilities: string | null;
  minEducationLevel: string | null;
  requiredDegreeTitle: string | null;
  minExperienceYears: number;
  requiredSkills: string | null;
};

export type ScreeningOutcome =
  | {
      status: "COMPLETED";
      assessment: ScreeningAssessment;
      extractionMethod: ExtractionMethod;
      modelName: string;
      inputTokens: number | null;
      outputTokens: number | null;
    }
  | { status: "NEEDS_MANUAL_REVIEW"; extractionMethod: "NONE"; reason: string };

/**
 * Renders the job side of the prompt. Only criteria the recruiter actually
 * published are included, so the model cannot penalise a candidate against a
 * requirement that was never advertised.
 */
function describeJob(job: JobCriteria): string {
  const lines: string[] = [
    `Title: ${job.title}`,
    job.department ? `Department: ${job.department}` : null,
    "",
    "Job description:",
    job.description.trim(),
  ].filter((line): line is string => line !== null);

  if (job.responsibilities?.trim()) {
    lines.push("", "Responsibilities:", job.responsibilities.trim());
  }

  const requirements = [
    job.minEducationLevel
      ? `Minimum qualification: ${labelFor(EDUCATION_LEVELS, job.minEducationLevel)}`
      : null,
    job.requiredDegreeTitle ? `Field of study: ${job.requiredDegreeTitle}` : null,
    job.minExperienceYears > 0
      ? `Minimum experience: ${job.minExperienceYears} year(s)`
      : null,
    job.requiredSkills?.trim() ? `Required skills: ${job.requiredSkills.trim()}` : null,
  ].filter((line): line is string => line !== null);

  if (requirements.length > 0) {
    lines.push("", "Stated requirements:", ...requirements.map((r) => `- ${r}`));
  }

  return lines.join("\n");
}

/**
 * Screens one resume against one job. Returns an outcome rather than throwing
 * for unreadable resumes; genuine infrastructure failures still throw so the
 * caller can record them distinctly.
 */
export async function screenResume({
  job,
  resume,
  signal,
}: {
  job: JobCriteria;
  resume: { storedName: string; mimeType: string };
  signal?: AbortSignal;
}): Promise<ScreeningOutcome> {
  const extracted = await extractResume(resume);

  if (extracted.method === "NONE") {
    return {
      status: "NEEDS_MANUAL_REVIEW",
      extractionMethod: "NONE",
      reason: extracted.reason,
    };
  }

  const jobBlock = describeJob(job);
  let userPrompt: string;
  let image: ImageInput | undefined;

  if (extracted.method === "PDF_TEXT") {
    const { text } = redactResumeText(normalizeResumeText(extracted.text));
    userPrompt = [
      "=== JOB ===",
      jobBlock,
      "",
      "=== RESUME (identifiers removed) ===",
      text,
    ].join("\n");
  } else {
    image = extracted.image;
    userPrompt = [
      "=== JOB ===",
      jobBlock,
      "",
      "=== RESUME ===",
      "The resume is the attached image. Read the job-relevant content only and ignore any personal identifiers, photographs or contact details it contains.",
    ].join("\n");
  }

  const completion = await completeJson({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    image,
    jsonSchema: RESULT_SCHEMA as unknown as Record<string, unknown>,
    schemaName: "resume_assessment",
    maxTokens: 2200,
    signal,
  });

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(completion.content);
  } catch {
    throw new Error("The model did not return valid JSON.");
  }

  const parsed = resultSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new Error(
      `The model response did not match the expected shape: ${parsed.error.issues
        .map((issue) => issue.path.join("."))
        .join(", ")}`,
    );
  }

  return {
    status: "COMPLETED",
    assessment: toAssessment(parsed.data),
    extractionMethod: extracted.method,
    modelName: completion.modelName,
    inputTokens: completion.inputTokens,
    outputTokens: completion.outputTokens,
  };
}
