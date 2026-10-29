import { parseSkills } from "@/lib/eligibility";

type EducationLike = {
  level: string;
  degreeTitle: string;
  majorSubjects?: string | null;
  institution?: string | null;
};

type ExperienceLike = {
  organization?: string | null;
  designation?: string | null;
  responsibilities?: string | null;
};

type CandidateLike = {
  educations: EducationLike[];
  experiences: ExperienceLike[];
};

export type JobPreferences = {
  preferredCertifications?: string | null;
  preferredKeywords?: string | null;
};

export type PreferenceMatch = {
  certifications: { preferred: string[]; matched: string[] };
  keywords: { preferred: string[]; matched: string[] };
  hitCount: number;
  total: number;
  /** 0–100 share of advertised preferences found on the profile or resume. */
  score: number;
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function displayTerms(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((term) => term.trim())
    .filter(Boolean);
}

export function termMatches(haystack: string, term: string): boolean {
  const hay = normalize(haystack);
  const needle = normalize(term);
  if (needle.length < 2) return false;
  return hay.includes(needle);
}

export function candidateHaystack(
  candidate: CandidateLike,
  extraText = "",
): string {
  return [
    ...candidate.educations.map(
      (education) =>
        `${education.level} ${education.degreeTitle} ${education.majorSubjects ?? ""} ${education.institution ?? ""}`,
    ),
    ...candidate.experiences.map(
      (experience) =>
        `${experience.organization ?? ""} ${experience.designation ?? ""} ${experience.responsibilities ?? ""}`,
    ),
    extraText,
  ].join(" ");
}

/**
 * Counts how many recruiter-set certifications and keywords appear in the
 * candidate profile or resume screening text. Missing preferences never fail
 * eligibility — they only raise ranking.
 */
export function evaluatePreferences(
  candidate: CandidateLike,
  job: JobPreferences,
  extraText = "",
): PreferenceMatch {
  const haystack = candidateHaystack(candidate, extraText);
  const certifications = displayTerms(job.preferredCertifications);
  const keywords = displayTerms(job.preferredKeywords);

  const matchedCerts = certifications.filter((term) =>
    termMatches(haystack, term),
  );
  const matchedKeywords = keywords.filter((term) => termMatches(haystack, term));
  const total = certifications.length + keywords.length;
  const hitCount = matchedCerts.length + matchedKeywords.length;

  return {
    certifications: { preferred: certifications, matched: matchedCerts },
    keywords: { preferred: keywords, matched: matchedKeywords },
    hitCount,
    total,
    score: total === 0 ? 0 : Math.round((hitCount / total) * 100),
  };
}

/** Resume-screening fields that are fair to search for advertised preferences. */
export function screeningPreferenceText(screening: {
  summary?: string | null;
  strengths?: string | null;
  matchedSkills?: string | null;
  parameters?: string | null;
} | null): string {
  if (!screening) return "";
  return [
    screening.summary ?? "",
    screening.strengths ?? "",
    screening.matchedSkills ?? "",
    screening.parameters ?? "",
  ].join(" ");
}

export function parsePreferenceList(raw: string | null | undefined): string[] {
  return parseSkills(raw);
}
