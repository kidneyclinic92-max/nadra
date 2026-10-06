/**
 * SQLite cannot express enums through Prisma, so every "enum" column is a
 * String validated against the lists below. These same lists drive the UI
 * dropdowns, which keeps the form options and the validation rules in sync.
 */

export type Option<T extends string = string> = { value: T; label: string };

function values<T extends string>(options: readonly Option<T>[]): [T, ...T[]] {
  return options.map((o) => o.value) as [T, ...T[]];
}

export const ROLES = [
  { value: "CANDIDATE", label: "Candidate" },
  { value: "RECRUITER", label: "Recruiter" },
  { value: "ADMIN", label: "Administrator" },
] as const;
export type Role = (typeof ROLES)[number]["value"];
export const ROLE_VALUES = values(ROLES);

export const GUARDIAN_RELATIONS = [
  { value: "FATHER", label: "Father" },
  { value: "HUSBAND", label: "Husband" },
] as const;
export const GUARDIAN_RELATION_VALUES = values(GUARDIAN_RELATIONS);

export const GENDERS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
] as const;
export const GENDER_VALUES = values(GENDERS);

export const MARITAL_STATUSES = [
  { value: "SINGLE", label: "Single" },
  { value: "MARRIED", label: "Married" },
  { value: "DIVORCED", label: "Divorced" },
  { value: "WIDOWED", label: "Widowed" },
] as const;
export const MARITAL_STATUS_VALUES = values(MARITAL_STATUSES);

export const PROVINCES = [
  { value: "PUNJAB", label: "Punjab" },
  { value: "SINDH", label: "Sindh" },
  { value: "KPK", label: "Khyber Pakhtunkhwa" },
  { value: "BALOCHISTAN", label: "Balochistan" },
  { value: "GILGIT_BALTISTAN", label: "Gilgit-Baltistan" },
  { value: "AJK", label: "Azad Jammu & Kashmir" },
  { value: "ICT", label: "Islamabad Capital Territory" },
] as const;
export const PROVINCE_VALUES = values(PROVINCES);

export const QUOTA_CATEGORIES = [
  { value: "OPEN_MERIT", label: "Open Merit" },
  { value: "WOMEN", label: "Women Quota" },
  { value: "MINORITY", label: "Minority Quota" },
  { value: "DISABLED", label: "Persons with Disability" },
  { value: "EX_SERVICEMEN", label: "Ex-Servicemen" },
] as const;
export const QUOTA_CATEGORY_VALUES = values(QUOTA_CATEGORIES);

/**
 * Ordered from lowest to highest. The index doubles as the comparison rank
 * used when checking a candidate against a job's minimum education level.
 */
export const EDUCATION_LEVELS = [
  { value: "MATRIC", label: "Matriculation / SSC" },
  { value: "INTERMEDIATE", label: "Intermediate / HSSC" },
  { value: "DIPLOMA", label: "Diploma / Associate Degree" },
  { value: "BACHELORS", label: "Bachelor's Degree" },
  { value: "MASTERS", label: "Master's Degree" },
  { value: "MPHIL", label: "MPhil / MS" },
  { value: "PHD", label: "PhD" },
  { value: "CERTIFICATION", label: "Professional Certification" },
] as const;
export type EducationLevel = (typeof EDUCATION_LEVELS)[number]["value"];
export const EDUCATION_LEVEL_VALUES = values(EDUCATION_LEVELS);

/**
 * Certifications sit outside the academic ladder, so they are unranked and
 * never satisfy a minimum-degree requirement on their own.
 */
const EDUCATION_RANK: Record<string, number> = {
  MATRIC: 1,
  INTERMEDIATE: 2,
  DIPLOMA: 3,
  BACHELORS: 4,
  MASTERS: 5,
  MPHIL: 6,
  PHD: 7,
  CERTIFICATION: 0,
};

export function educationRank(level: string | null | undefined): number {
  if (!level) return 0;
  return EDUCATION_RANK[level] ?? 0;
}

export const RESULT_TYPES = [
  { value: "MARKS", label: "Marks / Percentage" },
  { value: "CGPA", label: "CGPA" },
  { value: "GRADE", label: "Grade / Division" },
] as const;
export const RESULT_TYPE_VALUES = values(RESULT_TYPES);

export const EMPLOYMENT_TYPES = [
  { value: "FULL_TIME", label: "Full Time" },
  { value: "PART_TIME", label: "Part Time" },
  { value: "CONTRACT", label: "Contract" },
  { value: "INTERNSHIP", label: "Internship" },
] as const;
export const EMPLOYMENT_TYPE_VALUES = values(EMPLOYMENT_TYPES);

export const GENDER_REQUIREMENTS = [
  { value: "ANY", label: "Open to all" },
  { value: "MALE", label: "Male only" },
  { value: "FEMALE", label: "Female only" },
] as const;
export const GENDER_REQUIREMENT_VALUES = values(GENDER_REQUIREMENTS);

export const JOB_STATUSES = [
  { value: "DRAFT", label: "Draft" },
  { value: "OPEN", label: "Open" },
  { value: "CLOSED", label: "Closed" },
] as const;
export const JOB_STATUS_VALUES = values(JOB_STATUSES);

export const APPLICATION_STATUSES = [
  { value: "SUBMITTED", label: "Submitted" },
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "SHORTLISTED", label: "Shortlisted" },
  { value: "REJECTED", label: "Rejected" },
  { value: "WITHDRAWN", label: "Withdrawn" },
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]["value"];
export const APPLICATION_STATUS_VALUES = values(APPLICATION_STATUSES);

export const SCREENING_STATUSES = [
  { value: "PENDING", label: "Not screened" },
  { value: "COMPLETED", label: "Screened" },
  { value: "NEEDS_MANUAL_REVIEW", label: "Needs manual review" },
  { value: "FAILED", label: "Screening failed" },
] as const;
export const SCREENING_STATUS_VALUES = values(SCREENING_STATUSES);

/**
 * There is deliberately no "reject" recommendation. The model ranks relevance;
 * only a recruiter rejects an application.
 *
 * The bands and guidance here are the single source of truth: the screening
 * prompt is generated from them, and the recruiter UI explains scores with
 * them, so what the model was told and what the recruiter reads cannot drift.
 */
export const SCREENING_RECOMMENDATIONS = [
  {
    value: "STRONG_MATCH",
    label: "Strong match",
    min: 80,
    max: 100,
    guidance:
      "clearly meets the stated requirements with directly relevant experience",
  },
  {
    value: "POSSIBLE_MATCH",
    label: "Possible match",
    min: 50,
    max: 79,
    guidance:
      "meets much of the requirement but with a real gap, or adjacent rather than direct experience",
  },
  {
    value: "WEAK_MATCH",
    label: "Weak match",
    min: 0,
    max: 49,
    guidance: "little relevant evidence against the stated requirements",
  },
] as const;
export const SCREENING_RECOMMENDATION_VALUES = values(SCREENING_RECOMMENDATIONS);

export function screeningBand(recommendation: string | null | undefined) {
  return SCREENING_RECOMMENDATIONS.find((r) => r.value === recommendation) ?? null;
}

/**
 * The dimensions the model is allowed to score on. Weights sum to 100 and
 * are the same numbers written into the screening prompt, so the overall
 * match score is a weighted average of these — not a second, opaque number.
 *
 * Age, gender, domicile, quota and disability are deliberately absent: they
 * are not permissible inputs to a relevance score.
 */
export const SCREENING_PARAMETERS = [
  {
    value: "EDUCATION",
    label: "Qualification",
    weight: 15,
    description: "Whether the resume evidences the advertised minimum qualification.",
  },
  {
    value: "FIELD_OF_STUDY",
    label: "Field of study",
    weight: 10,
    description: "Whether the degree or major matches the advertised field.",
  },
  {
    value: "EXPERIENCE",
    label: "Experience",
    weight: 25,
    description: "Length and relevance of experience against the advertised minimum.",
  },
  {
    value: "SKILLS",
    label: "Required skills",
    weight: 20,
    description: "Which advertised skills the resume evidences.",
  },
  {
    value: "ROLE_FIT",
    label: "Role relevance",
    weight: 30,
    description: "How closely the work described matches this job's duties.",
  },
] as const;
export type ScreeningParameterId = (typeof SCREENING_PARAMETERS)[number]["value"];
export const SCREENING_PARAMETER_VALUES = values(SCREENING_PARAMETERS);

export const SCREENING_VERDICTS = [
  { value: "MET", label: "Evidenced" },
  { value: "PARTIAL", label: "Partially evidenced" },
  { value: "NOT_EVIDENCED", label: "Not evidenced" },
  { value: "NOT_APPLICABLE", label: "Not advertised" },
] as const;
export type ScreeningVerdict = (typeof SCREENING_VERDICTS)[number]["value"];

export const SCREENING_CONFIDENCE = [
  { value: "HIGH", label: "High confidence" },
  { value: "MEDIUM", label: "Medium confidence" },
  { value: "LOW", label: "Low confidence" },
] as const;
export type ScreeningConfidence = (typeof SCREENING_CONFIDENCE)[number]["value"];

export type ScreeningParameterResult = {
  id: ScreeningParameterId;
  verdict: ScreeningVerdict;
  score: number;
  requirement: string;
  evidence: string;
  finding: string;
};

/** Weighted average of assessed parameters; unadvertised criteria drop out. */
export function scoreFromParameters(
  parameters: Pick<ScreeningParameterResult, "id" | "score" | "verdict">[],
): number {
  const weightById = Object.fromEntries(
    SCREENING_PARAMETERS.map((p) => [p.value, p.weight]),
  ) as Record<string, number>;

  const assessed = parameters.filter((p) => p.verdict !== "NOT_APPLICABLE");
  const totalWeight = assessed.reduce((sum, p) => sum + (weightById[p.id] ?? 0), 0);
  if (totalWeight === 0) return 0;

  const weighted = assessed.reduce(
    (sum, p) => sum + p.score * (weightById[p.id] ?? 0),
    0,
  );
  return Math.round(weighted / totalWeight);
}

export function recommendationFromScore(score: number) {
  return (
    SCREENING_RECOMMENDATIONS.find((band) => score >= band.min && score <= band.max)
      ?.value ?? "WEAK_MATCH"
  );
}

/** How the resume was read. Surfaced so a recruiter can weigh reliability. */
export const EXTRACTION_METHODS = [
  { value: "PDF_TEXT", label: "PDF text layer" },
  { value: "VISION", label: "Image recognition" },
  { value: "NONE", label: "Could not be read" },
] as const;

export const DOCUMENT_TYPES = [
  {
    value: "PHOTO",
    label: "Passport Size Photograph",
    hint: "Recent, plain background",
    required: true,
  },
  {
    value: "CNIC_FRONT",
    label: "CNIC — Front Side",
    hint: "Clear scan or photo of the front",
    required: true,
  },
  {
    value: "CNIC_BACK",
    label: "CNIC — Back Side",
    hint: "Clear scan or photo of the back",
    required: true,
  },
  {
    value: "DOMICILE",
    label: "Domicile Certificate",
    hint: "Issued by your district authority",
    required: true,
  },
  {
    value: "RESUME",
    label: "Resume / CV",
    hint: "PDF preferred",
    required: true,
  },
  {
    value: "EDUCATION_CERTIFICATE",
    label: "Educational Documents",
    hint: "Degrees, transcripts and mark sheets",
    required: true,
    multiple: true,
  },
  {
    value: "EXPERIENCE_LETTER",
    label: "Experience Letters",
    hint: "Service or experience certificates",
    required: false,
    multiple: true,
  },
  {
    value: "OTHER",
    label: "Other Supporting Documents",
    hint: "Anything else relevant to your application",
    required: false,
    multiple: true,
  },
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number]["value"];
export const DOCUMENT_TYPE_VALUES = values(DOCUMENT_TYPES);

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const ALLOWED_UPLOAD_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

/** Narrows an arbitrary string to one of a constant list of allowed values. */
export function isOneOf<T extends string>(
  values: readonly T[],
  value: string,
): value is T {
  return (values as readonly string[]).includes(value);
}

export function labelFor(
  options: readonly { value: string; label: string }[],
  value: string | null | undefined,
): string {
  if (!value) return "—";
  return options.find((o) => o.value === value)?.label ?? value;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
