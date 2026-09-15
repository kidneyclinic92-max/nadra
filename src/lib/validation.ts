import { z } from "zod";
import {
  APPLICATION_STATUS_VALUES,
  DOCUMENT_TYPE_VALUES,
  EDUCATION_LEVEL_VALUES,
  EMPLOYMENT_TYPE_VALUES,
  GENDER_REQUIREMENT_VALUES,
  GENDER_VALUES,
  GUARDIAN_RELATION_VALUES,
  isOneOf,
  JOB_STATUS_VALUES,
  MARITAL_STATUS_VALUES,
  PROVINCE_VALUES,
  QUOTA_CATEGORY_VALUES,
  RESULT_TYPE_VALUES,
} from "@/lib/constants";

/** HTML forms submit empty strings for untouched fields; treat those as absent. */
const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" ? undefined : v));

const optionalEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" ? undefined : v))
    .refine((v) => v === undefined || values.includes(v), {
      message: "Please choose a valid option",
    });

const optionalNumber = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" || v === undefined ? undefined : Number(v)))
  .refine((v) => v === undefined || Number.isFinite(v), {
    message: "Must be a number",
  });

const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" || v === undefined ? undefined : new Date(v)))
  .refine((v) => v === undefined || !Number.isNaN(v.getTime()), {
    message: "Must be a valid date",
  });

/**
 * An unchecked box is absent from the payload entirely, so the key has to be
 * genuinely optional — a `z.undefined()` member in the union is not enough to
 * make Zod treat a missing key as present.
 */
const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal("false")])
  .optional()
  .transform((v) => v === "on" || v === "true");

export const CNIC_PATTERN = /^\d{5}-\d{7}-\d$/;
export const MOBILE_PATTERN = /^03\d{9}$/;

/** Accepts 0300-1234567, +92 300 1234567 etc. and stores a single canonical form. */
export function normalizeMobile(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("92")) return `0${digits.slice(2)}`;
  return digits;
}

/** Accepts 3520212345671 and formats it as 35202-1234567-1. */
export function normalizeCnic(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.length !== 13) return input.trim();
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

const cnicField = z
  .string()
  .trim()
  .transform(normalizeCnic)
  .refine((v) => CNIC_PATTERN.test(v), {
    message: "CNIC must be 13 digits, e.g. 35202-1234567-1",
  });

const mobileField = z
  .string()
  .trim()
  .transform(normalizeMobile)
  .refine((v) => MOBILE_PATTERN.test(v), {
    message: "Mobile number must be 11 digits starting with 03, e.g. 0300-1234567",
  });

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" ? undefined : v))
  .refine((v) => v === undefined || /^https?:\/\/.+\..+/.test(v), {
    message: "Enter a full URL starting with http:// or https://",
  });

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(3, "Please enter your full name"),
    email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")),
    cnic: cnicField,
    mobile: mobileField,
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")),
  password: z.string().min(1, "Enter your password"),
});

export const profileSchema = z.object({
  fullName: z.string().trim().min(3, "Please enter your full name"),
  guardianName: z.string().trim().min(3, "Please enter your father's or husband's name"),
  guardianRelation: z.enum(GUARDIAN_RELATION_VALUES),
  cnic: cnicField,
  dateOfBirth: optionalDate,
  gender: optionalEnum(GENDER_VALUES),
  maritalStatus: optionalEnum(MARITAL_STATUS_VALUES),
  religion: optionalText,
  // A `.default()` only fires for a missing key, but the form always submits
  // this field — so a cleared box arrives as "" and has to fall back here.
  nationality: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" || v === undefined ? "Pakistani" : v))
    .refine((v) => v.length >= 2, { message: "Enter a valid nationality" }),

  mobile: mobileField,
  alternateMobile: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : normalizeMobile(v)))
    .refine((v) => v === undefined || MOBILE_PATTERN.test(v), {
      message: "Alternate number must be 11 digits starting with 03",
    }),
  contactEmail: z
    .string()
    .trim()
    .toLowerCase()
    .optional()
    .transform((v) => (v === "" ? undefined : v))
    .refine((v) => v === undefined || z.email().safeParse(v).success, {
      message: "Enter a valid email address",
    }),
  linkedinUrl: optionalUrl,
  portfolioUrl: optionalUrl,

  currentAddress: optionalText,
  permanentAddress: optionalText,
  city: optionalText,
  province: optionalEnum(PROVINCE_VALUES),
  postalCode: optionalText,

  domicileDistrict: optionalText,
  domicileProvince: optionalEnum(PROVINCE_VALUES),

  quotaCategory: z.enum(QUOTA_CATEGORY_VALUES).default("OPEN_MERIT"),
  hasDisability: checkbox,
  disabilityDetails: optionalText,
});

export const educationSchema = z
  .object({
    level: z.enum(EDUCATION_LEVEL_VALUES),
    degreeTitle: z.string().trim().min(2, "Enter the degree or certificate title"),
    majorSubjects: optionalText,
    institution: z.string().trim().min(2, "Enter the institution name"),
    boardOrUniversity: optionalText,
    startYear: optionalNumber,
    passingYear: z.coerce
      .number()
      .int()
      .min(1950, "Enter a valid year")
      .max(new Date().getFullYear() + 6, "Passing year looks too far in the future"),
    resultType: z.enum(RESULT_TYPE_VALUES).default("MARKS"),
    obtainedMarks: optionalNumber,
    totalMarks: optionalNumber,
    cgpa: optionalNumber,
    maxCgpa: optionalNumber,
    grade: optionalText,
  })
  .refine(
    (d) =>
      d.resultType !== "MARKS" ||
      (d.obtainedMarks !== undefined && d.totalMarks !== undefined),
    {
      message: "Enter both obtained and total marks",
      path: ["obtainedMarks"],
    },
  )
  .refine((d) => d.resultType !== "CGPA" || d.cgpa !== undefined, {
    message: "Enter your CGPA",
    path: ["cgpa"],
  })
  .refine(
    (d) =>
      d.resultType !== "MARKS" ||
      d.totalMarks === undefined ||
      d.obtainedMarks === undefined ||
      d.obtainedMarks <= d.totalMarks,
    { message: "Obtained marks cannot exceed total marks", path: ["obtainedMarks"] },
  );

export const experienceSchema = z
  .object({
    organization: z.string().trim().min(2, "Enter the organization name"),
    designation: z.string().trim().min(2, "Enter your designation"),
    department: optionalText,
    employmentType: optionalEnum(EMPLOYMENT_TYPE_VALUES),
    startDate: z.coerce.date({ message: "Enter a valid start date" }),
    endDate: optionalDate,
    isCurrent: checkbox,
    responsibilities: optionalText,
  })
  .refine((d) => d.isCurrent || d.endDate !== undefined, {
    message: "Enter an end date or mark this as your current role",
    path: ["endDate"],
  })
  .refine((d) => d.endDate === undefined || d.endDate >= d.startDate, {
    message: "End date cannot be before the start date",
    path: ["endDate"],
  });

export const documentUploadSchema = z.object({
  type: z.enum(DOCUMENT_TYPE_VALUES),
  label: optionalText,
  educationId: optionalText,
  experienceId: optionalText,
});

export const jobSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(2, "Enter a job code")
      .regex(/^[A-Za-z0-9/-]+$/, "Use letters, numbers, hyphens and slashes only"),
    title: z.string().trim().min(3, "Enter the job title"),
    department: optionalText,
    description: z.string().trim().min(20, "Describe the role in at least 20 characters"),
    responsibilities: optionalText,
    city: optionalText,
    province: optionalEnum(PROVINCE_VALUES),
    employmentType: z.enum(EMPLOYMENT_TYPE_VALUES).default("FULL_TIME"),
    positions: z.coerce.number().int().min(1, "There must be at least one position"),
    payScale: optionalText,

    minEducationLevel: optionalEnum(EDUCATION_LEVEL_VALUES),
    requiredDegreeTitle: optionalText,
    minExperienceYears: z.coerce.number().int().min(0).max(50).default(0),
    minAge: optionalNumber,
    maxAge: optionalNumber,
    genderRequirement: z.enum(GENDER_REQUIREMENT_VALUES).default("ANY"),
    domicileRestriction: z
      .string()
      .trim()
      .default("ANY")
      .refine((v) => v === "ANY" || isOneOf(PROVINCE_VALUES, v), {
        message: "Choose a valid domicile restriction",
      }),
    requiredSkills: optionalText,

    status: z.enum(JOB_STATUS_VALUES).default("DRAFT"),
    closingDate: optionalDate,
  })
  .refine(
    (d) => d.minAge === undefined || d.maxAge === undefined || d.minAge <= d.maxAge,
    { message: "Minimum age cannot exceed maximum age", path: ["maxAge"] },
  );

export const applicationDecisionSchema = z.object({
  applicationIds: z.array(z.string().min(1)).min(1, "Select at least one applicant"),
  status: z.enum(APPLICATION_STATUS_VALUES),
  recruiterNotes: optionalText,
});

/**
 * Turns a FormData payload into a plain object. Repeated keys collapse into
 * arrays so multi-select filters and bulk-action checkboxes parse correctly.
 */
export function formDataToObject(formData: FormData): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (value instanceof File) continue;
    const existing = result[key];
    if (existing === undefined) {
      result[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      result[key] = [existing, value];
    }
  }
  return result;
}

export type FieldErrors = Record<string, string>;

/** Flattens a zod error into a `{ fieldName: firstMessage }` map for the UI. */
export function fieldErrorsFrom(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}
