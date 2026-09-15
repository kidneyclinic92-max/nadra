import { educationRank, labelFor, EDUCATION_LEVELS, PROVINCES } from "@/lib/constants";

type EducationLike = {
  level: string;
  degreeTitle: string;
  majorSubjects?: string | null;
};

type ExperienceLike = {
  startDate: Date;
  endDate: Date | null;
  isCurrent: boolean;
  designation?: string | null;
  responsibilities?: string | null;
};

type CandidateLike = {
  dateOfBirth?: Date | null;
  gender?: string | null;
  domicileProvince?: string | null;
  educations: EducationLike[];
  experiences: ExperienceLike[];
};

type JobLike = {
  minEducationLevel?: string | null;
  requiredDegreeTitle?: string | null;
  minExperienceYears: number;
  minAge?: number | null;
  maxAge?: number | null;
  genderRequirement: string;
  domicileRestriction: string;
  requiredSkills?: string | null;
};

const MS_PER_YEAR = 1000 * 60 * 60 * 24 * 365.25;

export function ageInYears(
  dateOfBirth: Date | null | undefined,
  asOf: Date = new Date(),
): number | null {
  if (!dateOfBirth) return null;
  return Math.floor((asOf.getTime() - dateOfBirth.getTime()) / MS_PER_YEAR);
}

/**
 * Sums each role's duration independently. Overlapping roles are counted
 * separately, matching how candidates usually present concurrent positions.
 */
export function totalExperienceYears(
  experiences: ExperienceLike[],
  asOf: Date = new Date(),
): number {
  const totalMs = experiences.reduce((sum, exp) => {
    const end = exp.isCurrent ? asOf : (exp.endDate ?? exp.startDate);
    const duration = end.getTime() - exp.startDate.getTime();
    return sum + Math.max(0, duration);
  }, 0);
  return Math.round((totalMs / MS_PER_YEAR) * 10) / 10;
}

export function highestEducation(educations: EducationLike[]): EducationLike | null {
  return educations.reduce<EducationLike | null>((best, current) => {
    if (!best) return current;
    return educationRank(current.level) > educationRank(best.level) ? current : best;
  }, null);
}

export function parseSkills(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export type CriterionCheck = {
  label: string;
  passed: boolean;
  detail: string;
  /** Criteria the candidate has not filled in yet are reported separately. */
  unknown?: boolean;
};

export type EligibilityResult = {
  /** Percentage of applicable criteria the candidate satisfies, 0-100. */
  score: number;
  checks: CriterionCheck[];
  meetsAll: boolean;
};

/**
 * Compares a candidate against a job's stated criteria. This is advisory: it
 * ranks and flags applicants for a recruiter, it never auto-rejects anyone.
 */
export function evaluateEligibility(
  candidate: CandidateLike,
  job: JobLike,
  asOf: Date = new Date(),
): EligibilityResult {
  const checks: CriterionCheck[] = [];

  if (job.minEducationLevel) {
    const best = highestEducation(candidate.educations);
    const required = educationRank(job.minEducationLevel);
    const attained = educationRank(best?.level);
    checks.push({
      label: "Education",
      passed: attained >= required,
      unknown: !best,
      detail: best
        ? `${labelFor(EDUCATION_LEVELS, best.level)} — requires ${labelFor(EDUCATION_LEVELS, job.minEducationLevel)}`
        : "No education records added",
    });
  }

  if (job.requiredDegreeTitle) {
    const needle = job.requiredDegreeTitle.toLowerCase();
    const matched = candidate.educations.some((e) =>
      `${e.degreeTitle} ${e.majorSubjects ?? ""}`.toLowerCase().includes(needle),
    );
    checks.push({
      label: "Field of study",
      passed: matched,
      detail: matched
        ? `Holds a degree in ${job.requiredDegreeTitle}`
        : `No degree matching "${job.requiredDegreeTitle}"`,
    });
  }

  if (job.minExperienceYears > 0) {
    const years = totalExperienceYears(candidate.experiences, asOf);
    checks.push({
      label: "Experience",
      passed: years >= job.minExperienceYears,
      detail: `${years} yr${years === 1 ? "" : "s"} — requires ${job.minExperienceYears} yr${job.minExperienceYears === 1 ? "" : "s"}`,
    });
  }

  if (job.minAge != null || job.maxAge != null) {
    const age = ageInYears(candidate.dateOfBirth, asOf);
    const withinRange =
      age != null &&
      (job.minAge == null || age >= job.minAge) &&
      (job.maxAge == null || age <= job.maxAge);
    const range = [
      job.minAge != null ? `min ${job.minAge}` : null,
      job.maxAge != null ? `max ${job.maxAge}` : null,
    ]
      .filter(Boolean)
      .join(", ");
    checks.push({
      label: "Age",
      passed: withinRange,
      unknown: age == null,
      detail: age == null ? "Date of birth not provided" : `${age} yrs — ${range}`,
    });
  }

  if (job.genderRequirement !== "ANY") {
    const passed = candidate.gender === job.genderRequirement;
    checks.push({
      label: "Gender",
      passed,
      unknown: !candidate.gender,
      detail: candidate.gender
        ? `${candidate.gender} — position is ${job.genderRequirement} only`
        : "Gender not provided",
    });
  }

  if (job.domicileRestriction !== "ANY") {
    const passed = candidate.domicileProvince === job.domicileRestriction;
    checks.push({
      label: "Domicile",
      passed,
      unknown: !candidate.domicileProvince,
      detail: candidate.domicileProvince
        ? `${labelFor(PROVINCES, candidate.domicileProvince)} — requires ${labelFor(PROVINCES, job.domicileRestriction)}`
        : "Domicile not provided",
    });
  }

  const requiredSkills = parseSkills(job.requiredSkills);
  if (requiredSkills.length > 0) {
    const haystack = [
      ...candidate.educations.map((e) => `${e.degreeTitle} ${e.majorSubjects ?? ""}`),
      ...candidate.experiences.map(
        (e) => `${e.designation ?? ""} ${e.responsibilities ?? ""}`,
      ),
    ]
      .join(" ")
      .toLowerCase();

    const matched = requiredSkills.filter((skill) => haystack.includes(skill));
    checks.push({
      label: "Skills",
      passed: matched.length === requiredSkills.length,
      detail: `${matched.length} of ${requiredSkills.length} matched${
        matched.length ? `: ${matched.join(", ")}` : ""
      }`,
    });
  }

  // With no criteria defined every applicant is equally eligible.
  if (checks.length === 0) {
    return { score: 100, checks, meetsAll: true };
  }

  const passedCount = checks.filter((c) => c.passed).length;
  return {
    score: Math.round((passedCount / checks.length) * 100),
    checks,
    meetsAll: passedCount === checks.length,
  };
}
