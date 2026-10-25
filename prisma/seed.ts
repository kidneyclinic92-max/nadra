/**
 * Development seed data.
 *
 * Creates one admin, one recruiter, a spread of candidates whose profiles
 * deliberately pass and fail different criteria, and several positions so the
 * shortlisting screen has something meaningful to sort.
 *
 * Run with: npm run db:seed
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { evaluateEligibility } from "../src/lib/eligibility";
import {
  recommendationFromScore,
  type ScreeningParameterResult,
} from "../src/lib/constants";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

// Local development only. Change these before deploying anywhere real.
const DEMO_PASSWORD = "Password123!";

function yearsAgo(years: number, month = 0, day = 1): Date {
  const now = new Date();
  return new Date(now.getFullYear() - years, month, day);
}

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

type EducationSeed = {
  level: string;
  degreeTitle: string;
  majorSubjects?: string;
  institution: string;
  boardOrUniversity: string;
  passingYear: number;
  resultType: string;
  cgpa?: number;
  maxCgpa?: number;
  obtainedMarks?: number;
  totalMarks?: number;
};

type ExperienceSeed = {
  organization: string;
  designation: string;
  employmentType: string;
  startYearsAgo: number;
  endYearsAgo?: number;
  isCurrent: boolean;
  responsibilities: string;
};

type CandidateSeed = {
  email: string;
  fullName: string;
  guardianName: string;
  guardianRelation: string;
  cnic: string;
  gender: string;
  maritalStatus: string;
  mobile: string;
  city: string;
  province: string;
  domicileDistrict: string;
  domicileProvince: string;
  quotaCategory: string;
  birthYearsAgo: number;
  linkedinUrl?: string;
  hasDisability?: boolean;
  disabilityDetails?: string;
  educations: EducationSeed[];
  experiences: ExperienceSeed[];
};

type JobSeed = {
  code: string;
  title: string;
  department: string;
  description: string;
  responsibilities?: string;
  city: string;
  province: string;
  employmentType?: string;
  positions: number;
  payScale: string;
  minEducationLevel: string;
  requiredDegreeTitle?: string;
  minExperienceYears: number;
  minAge?: number;
  maxAge?: number;
  genderRequirement: string;
  domicileRestriction: string;
  requiredSkills?: string;
  status: string;
  closingDays: number | null;
};

const CANDIDATE_SEEDS: CandidateSeed[] = [
  {
    email: "ayesha.khan@example.com",
    fullName: "Ayesha Khan",
    guardianName: "Muhammad Iqbal Khan",
    guardianRelation: "FATHER",
    cnic: "35202-1234567-2",
    gender: "FEMALE",
    maritalStatus: "SINGLE",
    mobile: "03001234567",
    city: "Lahore",
    province: "PUNJAB",
    domicileDistrict: "Lahore",
    domicileProvince: "PUNJAB",
    quotaCategory: "WOMEN",
    birthYearsAgo: 27,
    linkedinUrl: "https://linkedin.com/in/ayesha-khan-demo",
    educations: [
      {
        level: "MASTERS",
        degreeTitle: "MS Computer Science",
        majorSubjects: "Machine Learning, Databases",
        institution: "Punjab University",
        boardOrUniversity: "University of the Punjab",
        passingYear: 2022,
        resultType: "CGPA",
        cgpa: 3.72,
        maxCgpa: 4,
      },
      {
        level: "BACHELORS",
        degreeTitle: "BS Computer Science",
        institution: "FAST NUCES",
        boardOrUniversity: "FAST NUCES",
        passingYear: 2020,
        resultType: "CGPA",
        cgpa: 3.5,
        maxCgpa: 4,
      },
    ],
    experiences: [
      {
        organization: "Systems Limited",
        designation: "Software Engineer",
        employmentType: "FULL_TIME",
        startYearsAgo: 4,
        isCurrent: true,
        responsibilities:
          "Building internal reporting tools with SQL and TypeScript. Led data migration for the HR module.",
      },
    ],
  },
  {
    email: "bilal.ahmed@example.com",
    fullName: "Bilal Ahmed",
    guardianName: "Rashid Ahmed",
    guardianRelation: "FATHER",
    cnic: "42101-7654321-3",
    gender: "MALE",
    maritalStatus: "MARRIED",
    mobile: "03217654321",
    city: "Karachi",
    province: "SINDH",
    domicileDistrict: "Karachi East",
    domicileProvince: "SINDH",
    quotaCategory: "OPEN_MERIT",
    birthYearsAgo: 32,
    educations: [
      {
        level: "BACHELORS",
        degreeTitle: "BE Electrical Engineering",
        institution: "NED University",
        boardOrUniversity: "NED University of Engineering & Technology",
        passingYear: 2016,
        resultType: "CGPA",
        cgpa: 3.1,
        maxCgpa: 4,
      },
    ],
    experiences: [
      {
        organization: "K-Electric",
        designation: "Assistant Manager Operations",
        employmentType: "FULL_TIME",
        startYearsAgo: 8,
        isCurrent: true,
        responsibilities:
          "Managing grid maintenance schedules and vendor coordination. Project management of substation upgrades.",
      },
    ],
  },
  {
    email: "fatima.zahra@example.com",
    fullName: "Fatima Zahra",
    guardianName: "Ali Raza",
    guardianRelation: "HUSBAND",
    cnic: "17301-2233445-6",
    gender: "FEMALE",
    maritalStatus: "MARRIED",
    mobile: "03339988776",
    city: "Peshawar",
    province: "KPK",
    domicileDistrict: "Peshawar",
    domicileProvince: "KPK",
    quotaCategory: "WOMEN",
    birthYearsAgo: 29,
    educations: [
      {
        level: "MASTERS",
        degreeTitle: "MSc Public Administration",
        majorSubjects: "Public Policy, Governance",
        institution: "University of Peshawar",
        boardOrUniversity: "University of Peshawar",
        passingYear: 2021,
        resultType: "MARKS",
        obtainedMarks: 812,
        totalMarks: 1100,
      },
    ],
    experiences: [
      {
        organization: "Provincial Planning Department",
        designation: "Research Officer",
        employmentType: "CONTRACT",
        startYearsAgo: 3,
        isCurrent: true,
        responsibilities:
          "Drafting policy briefs and managing stakeholder consultations. Report writing and data analysis.",
      },
    ],
  },
  {
    email: "usman.tariq@example.com",
    fullName: "Usman Tariq",
    guardianName: "Tariq Mehmood",
    guardianRelation: "FATHER",
    cnic: "61101-5566778-9",
    gender: "MALE",
    maritalStatus: "SINGLE",
    mobile: "03005556677",
    city: "Islamabad",
    province: "ICT",
    domicileDistrict: "Islamabad",
    domicileProvince: "ICT",
    quotaCategory: "OPEN_MERIT",
    birthYearsAgo: 23,
    educations: [
      {
        level: "BACHELORS",
        degreeTitle: "BS Software Engineering",
        majorSubjects: "Software Engineering, Databases",
        institution: "COMSATS Islamabad",
        boardOrUniversity: "COMSATS University",
        passingYear: 2025,
        resultType: "CGPA",
        cgpa: 3.85,
        maxCgpa: 4,
      },
    ],
    experiences: [],
  },
  {
    email: "hina.baloch@example.com",
    fullName: "Hina Baloch",
    guardianName: "Abdul Karim Baloch",
    guardianRelation: "FATHER",
    cnic: "54400-9988776-4",
    gender: "FEMALE",
    maritalStatus: "SINGLE",
    mobile: "03448877665",
    city: "Quetta",
    province: "BALOCHISTAN",
    domicileDistrict: "Quetta",
    domicileProvince: "BALOCHISTAN",
    quotaCategory: "DISABLED",
    hasDisability: true,
    disabilityDetails: "Hearing impairment, holds a certificate from the district office.",
    birthYearsAgo: 26,
    educations: [
      {
        level: "BACHELORS",
        degreeTitle: "BS Accounting & Finance",
        majorSubjects: "Accounting, Audit",
        institution: "University of Balochistan",
        boardOrUniversity: "University of Balochistan",
        passingYear: 2023,
        resultType: "CGPA",
        cgpa: 3.4,
        maxCgpa: 4,
      },
    ],
    experiences: [
      {
        organization: "Ferguson & Co",
        designation: "Audit Associate",
        employmentType: "FULL_TIME",
        startYearsAgo: 2,
        isCurrent: true,
        responsibilities: "Statutory audits, reconciliation and SQL based reporting.",
      },
    ],
  },
  {
    email: "imran.shah@example.com",
    fullName: "Imran Shah",
    guardianName: "Nadir Shah",
    guardianRelation: "FATHER",
    cnic: "37405-1122334-5",
    gender: "MALE",
    maritalStatus: "MARRIED",
    mobile: "03011122334",
    city: "Rawalpindi",
    province: "PUNJAB",
    domicileDistrict: "Rawalpindi",
    domicileProvince: "PUNJAB",
    quotaCategory: "EX_SERVICEMEN",
    birthYearsAgo: 41,
    educations: [
      {
        level: "INTERMEDIATE",
        degreeTitle: "FSc Pre-Engineering",
        institution: "Government College Rawalpindi",
        boardOrUniversity: "BISE Rawalpindi",
        passingYear: 2003,
        resultType: "MARKS",
        obtainedMarks: 720,
        totalMarks: 1100,
      },
    ],
    experiences: [
      {
        organization: "Pakistan Army",
        designation: "Junior Commissioned Officer",
        employmentType: "FULL_TIME",
        startYearsAgo: 20,
        endYearsAgo: 1,
        isCurrent: false,
        responsibilities: "Logistics coordination, personnel management and training.",
      },
    ],
  },
  {
    email: "sara.malik@example.com",
    fullName: "Sara Malik",
    guardianName: "Javed Malik",
    guardianRelation: "FATHER",
    cnic: "35201-3344556-8",
    gender: "FEMALE",
    maritalStatus: "SINGLE",
    mobile: "03024455667",
    city: "Lahore",
    province: "PUNJAB",
    domicileDistrict: "Lahore",
    domicileProvince: "PUNJAB",
    quotaCategory: "WOMEN",
    birthYearsAgo: 28,
    linkedinUrl: "https://linkedin.com/in/sara-malik-demo",
    educations: [
      {
        level: "MASTERS",
        degreeTitle: "MS Software Engineering",
        majorSubjects: "Distributed Systems, TypeScript",
        institution: "LUMS",
        boardOrUniversity: "Lahore University of Management Sciences",
        passingYear: 2021,
        resultType: "CGPA",
        cgpa: 3.81,
        maxCgpa: 4,
      },
      {
        level: "BACHELORS",
        degreeTitle: "BS Computer Science",
        institution: "ITU Punjab",
        boardOrUniversity: "Information Technology University",
        passingYear: 2019,
        resultType: "CGPA",
        cgpa: 3.64,
        maxCgpa: 4,
      },
    ],
    experiences: [
      {
        organization: "Systems Limited",
        designation: "Senior Software Engineer",
        employmentType: "FULL_TIME",
        startYearsAgo: 5,
        isCurrent: true,
        responsibilities:
          "Lead TypeScript and SQL services for internal HR and reporting platforms. Own schema design, API reviews and production releases.",
      },
    ],
  },
  {
    email: "omar.qureshi@example.com",
    fullName: "Omar Qureshi",
    guardianName: "Fahim Qureshi",
    guardianRelation: "FATHER",
    cnic: "42101-9988776-1",
    gender: "MALE",
    maritalStatus: "SINGLE",
    mobile: "03219887766",
    city: "Karachi",
    province: "SINDH",
    domicileDistrict: "Karachi South",
    domicileProvince: "SINDH",
    quotaCategory: "OPEN_MERIT",
    birthYearsAgo: 25,
    educations: [
      {
        level: "BACHELORS",
        degreeTitle: "BS Information Technology",
        majorSubjects: "Web development, Databases",
        institution: "IBA Karachi",
        boardOrUniversity: "Institute of Business Administration",
        passingYear: 2023,
        resultType: "CGPA",
        cgpa: 3.2,
        maxCgpa: 4,
      },
    ],
    experiences: [
      {
        organization: "10Pearls",
        designation: "Junior Software Engineer",
        employmentType: "FULL_TIME",
        startYearsAgo: 2,
        isCurrent: true,
        responsibilities:
          "Build React and Node features for client portals. Write SQL reports and help with bug fixes.",
      },
    ],
  },
  {
    email: "nadia.rehman@example.com",
    fullName: "Nadia Rehman",
    guardianName: "Abdul Rehman",
    guardianRelation: "FATHER",
    cnic: "17301-5566778-2",
    gender: "FEMALE",
    maritalStatus: "SINGLE",
    mobile: "03335566778",
    city: "Peshawar",
    province: "KPK",
    domicileDistrict: "Peshawar",
    domicileProvince: "KPK",
    quotaCategory: "WOMEN",
    birthYearsAgo: 30,
    educations: [
      {
        level: "MASTERS",
        degreeTitle: "MPA Public Administration",
        majorSubjects: "Public policy, Governance",
        institution: "University of Peshawar",
        boardOrUniversity: "University of Peshawar",
        passingYear: 2020,
        resultType: "MARKS",
        obtainedMarks: 854,
        totalMarks: 1100,
      },
    ],
    experiences: [
      {
        organization: "Khyber Pakhtunkhwa Planning Cell",
        designation: "Policy Analyst",
        employmentType: "FULL_TIME",
        startYearsAgo: 4,
        isCurrent: true,
        responsibilities:
          "Draft provincial policy notes, analyse programme data and run district consultations.",
      },
    ],
  },
  {
    email: "kamran.ali@example.com",
    fullName: "Kamran Ali",
    guardianName: "Sajid Ali",
    guardianRelation: "FATHER",
    cnic: "42301-1122445-7",
    gender: "MALE",
    maritalStatus: "MARRIED",
    mobile: "03031122445",
    city: "Hyderabad",
    province: "SINDH",
    domicileDistrict: "Hyderabad",
    domicileProvince: "SINDH",
    quotaCategory: "OPEN_MERIT",
    birthYearsAgo: 27,
    educations: [
      {
        level: "BACHELORS",
        degreeTitle: "BCom Accounting",
        majorSubjects: "Accounting, Audit",
        institution: "University of Sindh",
        boardOrUniversity: "University of Sindh",
        passingYear: 2021,
        resultType: "CGPA",
        cgpa: 3.45,
        maxCgpa: 4,
      },
    ],
    experiences: [
      {
        organization: "A. F. Ferguson & Co",
        designation: "Accounts Associate",
        employmentType: "FULL_TIME",
        startYearsAgo: 3,
        isCurrent: true,
        responsibilities:
          "Monthly reconciliation, ledger close and supporting external audit files.",
      },
    ],
  },
  {
    email: "zainab.noor@example.com",
    fullName: "Zainab Noor",
    guardianName: "Noor Ahmed",
    guardianRelation: "FATHER",
    cnic: "61101-7788990-4",
    gender: "FEMALE",
    maritalStatus: "SINGLE",
    mobile: "03117788990",
    city: "Islamabad",
    province: "ICT",
    domicileDistrict: "Islamabad",
    domicileProvince: "ICT",
    quotaCategory: "OPEN_MERIT",
    birthYearsAgo: 22,
    educations: [
      {
        level: "BACHELORS",
        degreeTitle: "BS Software Engineering",
        majorSubjects: "Software engineering, Databases",
        institution: "NUST",
        boardOrUniversity: "National University of Sciences & Technology",
        passingYear: 2025,
        resultType: "CGPA",
        cgpa: 3.91,
        maxCgpa: 4,
      },
    ],
    experiences: [
      {
        organization: "NUST Career Services",
        designation: "Software Intern",
        employmentType: "INTERNSHIP",
        startYearsAgo: 1,
        endYearsAgo: 0,
        isCurrent: false,
        responsibilities:
          "Assisted with campus portal features, tests and documentation in TypeScript.",
      },
    ],
  },
];

/**
 * Who applied where, and the dummy AI score to show. A null score leaves the
 * row unscreened so the recruiter can still press "Screen applicants".
 */
const APPLICATION_SEEDS: {
  email: string;
  jobCode: string;
  matchScore: number | null;
}[] = [
  { email: "sara.malik@example.com", jobCode: "IT/2026/001", matchScore: 92 },
  { email: "ayesha.khan@example.com", jobCode: "IT/2026/001", matchScore: 88 },
  { email: "zainab.noor@example.com", jobCode: "IT/2026/001", matchScore: 73 },
  { email: "omar.qureshi@example.com", jobCode: "IT/2026/001", matchScore: 67 },
  { email: "usman.tariq@example.com", jobCode: "IT/2026/001", matchScore: 41 },
  { email: "bilal.ahmed@example.com", jobCode: "IT/2026/001", matchScore: 24 },

  { email: "fatima.zahra@example.com", jobCode: "ADM/2026/007", matchScore: 91 },
  { email: "nadia.rehman@example.com", jobCode: "ADM/2026/007", matchScore: 83 },
  { email: "ayesha.khan@example.com", jobCode: "ADM/2026/007", matchScore: 38 },
  { email: "imran.shah@example.com", jobCode: "ADM/2026/007", matchScore: null },

  { email: "hina.baloch@example.com", jobCode: "FIN/2026/012", matchScore: 87 },
  { email: "kamran.ali@example.com", jobCode: "FIN/2026/012", matchScore: 84 },
  { email: "imran.shah@example.com", jobCode: "FIN/2026/012", matchScore: 31 },
  { email: "ayesha.khan@example.com", jobCode: "FIN/2026/012", matchScore: 29 },

  { email: "zainab.noor@example.com", jobCode: "IT/2026/018", matchScore: 89 },
  { email: "usman.tariq@example.com", jobCode: "IT/2026/018", matchScore: 86 },
  { email: "omar.qureshi@example.com", jobCode: "IT/2026/018", matchScore: 71 },
  { email: "sara.malik@example.com", jobCode: "IT/2026/018", matchScore: 64 },
  { email: "hina.baloch@example.com", jobCode: "IT/2026/018", matchScore: 22 },
];

const JOB_SEEDS: JobSeed[] = [
  {
    code: "IT/2026/001",
    title: "Assistant Director (Information Technology)",
    department: "Information Technology",
    description:
      "The department is seeking an Assistant Director to lead the development and maintenance of internal digital systems. The successful candidate will work with the data team to modernise reporting and support departmental automation initiatives.",
    responsibilities:
      "Lead in-house application development\nMaintain departmental databases and reporting pipelines\nCoordinate with vendors on system integrations\nPrepare technical documentation and progress reports",
    city: "Lahore",
    province: "PUNJAB",
    positions: 2,
    payScale: "BPS-17",
    minEducationLevel: "BACHELORS",
    requiredDegreeTitle: "Computer Science",
    minExperienceYears: 3,
    minAge: 22,
    maxAge: 35,
    genderRequirement: "ANY",
    domicileRestriction: "ANY",
    requiredSkills: "SQL, TypeScript, databases",
    status: "OPEN",
    closingDays: 21,
  },
  {
    code: "ADM/2026/007",
    title: "Research Officer (Policy & Planning)",
    department: "Planning & Development",
    description:
      "A Research Officer is required to support evidence-based policy formulation. The role involves preparing policy briefs, analysing departmental data and coordinating consultations with provincial stakeholders.",
    responsibilities:
      "Prepare policy briefs and research summaries\nAnalyse programme data and prepare reports\nCoordinate stakeholder consultations",
    city: "Peshawar",
    province: "KPK",
    positions: 1,
    payScale: "BPS-17",
    minEducationLevel: "MASTERS",
    requiredDegreeTitle: "Public Administration",
    minExperienceYears: 2,
    minAge: 22,
    maxAge: 33,
    genderRequirement: "ANY",
    domicileRestriction: "KPK",
    requiredSkills: "policy, research, report writing",
    status: "OPEN",
    closingDays: 14,
  },
  {
    code: "FIN/2026/012",
    title: "Accounts Officer",
    department: "Finance",
    description:
      "The Finance wing requires an Accounts Officer to handle budget preparation, reconciliation and audit compliance for departmental accounts.",
    responsibilities:
      "Maintain departmental accounts and ledgers\nPrepare budget estimates and variance reports\nLiaise with external auditors",
    city: "Karachi",
    province: "SINDH",
    positions: 3,
    payScale: "BPS-16",
    minEducationLevel: "BACHELORS",
    requiredDegreeTitle: "Accounting",
    minExperienceYears: 1,
    minAge: 21,
    maxAge: 30,
    genderRequirement: "ANY",
    domicileRestriction: "ANY",
    requiredSkills: "audit, reconciliation",
    status: "OPEN",
    closingDays: 30,
  },
  {
    code: "IT/2026/018",
    title: "Junior Software Developer (Internship)",
    department: "Information Technology",
    description:
      "A twelve month paid internship for fresh graduates who want hands-on experience building and maintaining public sector digital services.",
    responsibilities:
      "Assist with feature development and bug fixes\nWrite tests and documentation",
    city: "Islamabad",
    province: "ICT",
    employmentType: "INTERNSHIP",
    positions: 5,
    payScale: "Stipend",
    minEducationLevel: "BACHELORS",
    minExperienceYears: 0,
    minAge: 20,
    maxAge: 26,
    genderRequirement: "ANY",
    domicileRestriction: "ANY",
    requiredSkills: "software engineering",
    status: "OPEN",
    closingDays: 10,
  },
  {
    code: "HR/2026/003",
    title: "Deputy Director (Human Resources)",
    department: "Human Resources",
    description:
      "Draft advertisement for a Deputy Director to oversee recruitment, service records and departmental training programmes.",
    city: "Lahore",
    province: "PUNJAB",
    positions: 1,
    payScale: "BPS-18",
    minEducationLevel: "MASTERS",
    minExperienceYears: 7,
    genderRequirement: "ANY",
    domicileRestriction: "PUNJAB",
    status: "DRAFT",
    closingDays: null,
  },
];

async function main() {
  console.log("Clearing existing data…");
  await prisma.resumeScreening.deleteMany();
  await prisma.application.deleteMany();
  await prisma.document.deleteMany();
  await prisma.experience.deleteMany();
  await prisma.education.deleteMany();
  await prisma.candidate.deleteMany();
  await prisma.job.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  console.log("Creating staff accounts…");
  const admin = await prisma.user.create({
    data: { email: "admin@recruitment.gov.pk", passwordHash, role: "ADMIN" },
  });
  const recruiter = await prisma.user.create({
    data: { email: "recruiter@recruitment.gov.pk", passwordHash, role: "RECRUITER" },
  });

  console.log("Creating positions…");
  const jobs = [];
  for (const seed of JOB_SEEDS) {
    const { closingDays, ...rest } = seed;
    jobs.push(
      await prisma.job.create({
        data: {
          ...rest,
          employmentType: rest.employmentType ?? "FULL_TIME",
          closingDate: closingDays != null ? daysFromNow(closingDays) : null,
          createdById: closingDays != null ? recruiter.id : admin.id,
        },
      }),
    );
  }

  console.log("Creating candidates…");
  for (const seed of CANDIDATE_SEEDS) {
    const {
      email,
      educations,
      experiences,
      birthYearsAgo,
      hasDisability,
      disabilityDetails,
      ...profile
    } = seed;

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: "CANDIDATE",
        candidate: {
          create: {
            ...profile,
            contactEmail: email,
            dateOfBirth: yearsAgo(birthYearsAgo, 5, 15),
            currentAddress: `House 12, Street 4, ${profile.city}`,
            permanentAddress: `House 12, Street 4, ${profile.city}`,
            postalCode: "54000",
            hasDisability: hasDisability ?? false,
            disabilityDetails: disabilityDetails ?? null,
            isProfileComplete: true,
          },
        },
      },
      include: { candidate: true },
    });

    const candidateId = user.candidate!.id;

    for (const education of educations) {
      await prisma.education.create({ data: { ...education, candidateId } });
    }

    for (const experience of experiences) {
      const { startYearsAgo, endYearsAgo, ...rest } = experience;
      await prisma.experience.create({
        data: {
          ...rest,
          candidateId,
          startDate: yearsAgo(startYearsAgo, 0, 1),
          endDate: endYearsAgo != null ? yearsAgo(endYearsAgo, 0, 1) : null,
        },
      });
    }
  }

  console.log("Creating applications and dummy AI scores…");
  const candidates = await prisma.candidate.findMany({
    include: { user: true, educations: true, experiences: true },
  });
  const candidateByEmail = new Map(
    candidates.map((candidate) => [candidate.user.email, candidate]),
  );
  const jobByCode = new Map(jobs.map((job) => [job.code, job]));

  let applicationCount = 0;
  let screenedCount = 0;

  for (const seed of APPLICATION_SEEDS) {
    const candidate = candidateByEmail.get(seed.email);
    const job = jobByCode.get(seed.jobCode);
    if (!candidate || !job) {
      throw new Error(`Seed reference missing: ${seed.email} → ${seed.jobCode}`);
    }

    const result = evaluateEligibility(candidate, job);
    const application = await prisma.application.create({
      data: {
        jobId: job.id,
        candidateId: candidate.id,
        eligibilityScore: result.score,
        status: result.meetsAll ? "UNDER_REVIEW" : "SUBMITTED",
        coverNote:
          result.score >= 75
            ? `I believe my background aligns closely with the requirements for ${job.title}.`
            : null,
      },
    });
    applicationCount += 1;

    if (seed.matchScore == null) continue;

    const screening = buildDemoScreening(job, candidate.fullName, seed.matchScore);
    await prisma.resumeScreening.create({
      data: {
        applicationId: application.id,
        status: "COMPLETED",
        matchScore: screening.matchScore,
        recommendation: screening.recommendation,
        summary: screening.summary,
        strengths: JSON.stringify(screening.strengths),
        gaps: JSON.stringify(screening.gaps),
        matchedSkills: JSON.stringify(screening.matchedSkills),
        missingSkills: JSON.stringify(screening.missingSkills),
        parameters: JSON.stringify(screening.parameters),
        confidence: screening.confidence,
        extractionMethod: "PDF_TEXT",
        modelName: "demo-seed",
        promptVersion: "demo-seed",
        scannedAt: new Date(),
      },
    });
    screenedCount += 1;
  }

  console.log(
    `\nSeed complete: ${jobs.length} positions, ${candidates.length} candidates, ${applicationCount} applications, ${screenedCount} dummy AI scores.`,
  );
  console.log("\nDemo sign-in details (development only):");
  console.log(`  Admin      admin@recruitment.gov.pk      / ${DEMO_PASSWORD}`);
  console.log(`  Recruiter  recruiter@recruitment.gov.pk  / ${DEMO_PASSWORD}`);
  console.log(`  Candidate  ayesha.khan@example.com       / ${DEMO_PASSWORD}`);
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildDemoScreening(
  job: {
    title: string;
    minEducationLevel: string | null;
    requiredDegreeTitle: string | null;
    minExperienceYears: number;
    requiredSkills: string | null;
    responsibilities: string | null;
  },
  fullName: string,
  intendedScore: number,
) {
  const advertisedSkills = (job.requiredSkills ?? "")
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);
  const strong = intendedScore >= 80;
  const mid = intendedScore >= 50;

  const education: ScreeningParameterResult = {
    id: "EDUCATION",
    verdict: strong || mid ? "MET" : "PARTIAL",
    score: clampScore(intendedScore + (strong ? 6 : mid ? 4 : -8)),
    requirement: job.minEducationLevel ?? "Not advertised",
    evidence: strong
      ? "Degree title and passing year are stated on the resume."
      : mid
        ? "A related qualification is stated, though not an exact match."
        : "Not stated in the resume.",
    finding: strong
      ? "The advertised minimum qualification is clearly evidenced."
      : mid
        ? "A qualification is present but does not fully match the advertised level."
        : "The resume does not evidence the advertised minimum qualification.",
  };

  const field: ScreeningParameterResult = {
    id: "FIELD_OF_STUDY",
    verdict: job.requiredDegreeTitle
      ? strong
        ? "MET"
        : mid
          ? "PARTIAL"
          : "NOT_EVIDENCED"
      : "NOT_APPLICABLE",
    score: job.requiredDegreeTitle
      ? clampScore(intendedScore + (strong ? 4 : mid ? -4 : -20))
      : 0,
    requirement: job.requiredDegreeTitle ?? "Not advertised",
    evidence: job.requiredDegreeTitle
      ? strong
        ? `Resume lists a degree aligned with ${job.requiredDegreeTitle}.`
        : mid
          ? "Resume lists an adjacent field of study."
          : "Not stated in the resume."
      : "Not advertised for this post.",
    finding: job.requiredDegreeTitle
      ? strong
        ? "Field of study matches the advertised requirement."
        : mid
          ? "Field of study is related but not a direct match."
          : "No evidence of the advertised field of study."
      : "Not advertised for this post.",
  };

  const experience: ScreeningParameterResult = {
    id: "EXPERIENCE",
    verdict:
      job.minExperienceYears <= 0
        ? "NOT_APPLICABLE"
        : strong
          ? "MET"
          : mid
            ? "PARTIAL"
            : "NOT_EVIDENCED",
    score:
      job.minExperienceYears <= 0
        ? 0
        : clampScore(intendedScore + (strong ? 2 : mid ? -6 : -18)),
    requirement:
      job.minExperienceYears > 0
        ? `${job.minExperienceYears}+ years`
        : "Not advertised",
    evidence:
      job.minExperienceYears <= 0
        ? "Not advertised for this post."
        : strong
          ? "Current and previous roles cover the advertised length of experience."
          : mid
            ? "Some relevant work is listed, but the duration is shorter than advertised."
            : "Not stated in the resume.",
    finding:
      job.minExperienceYears <= 0
        ? "Not advertised for this post."
        : strong
          ? "Experience length and relevance meet the advertised minimum."
          : mid
            ? "Experience is only partly relevant to the advertised minimum."
            : "The resume does not evidence the advertised experience.",
  };

  const skills: ScreeningParameterResult = {
    id: "SKILLS",
    verdict: advertisedSkills.length
      ? strong
        ? "MET"
        : mid
          ? "PARTIAL"
          : "NOT_EVIDENCED"
      : "NOT_APPLICABLE",
    score: advertisedSkills.length
      ? clampScore(intendedScore + (strong ? 3 : mid ? -2 : -16))
      : 0,
    requirement: advertisedSkills.join(", ") || "Not advertised",
    evidence: advertisedSkills.length
      ? strong
        ? `Resume mentions ${advertisedSkills.slice(0, 2).join(" and ")}.`
        : mid
          ? "Resume mentions one of the advertised skills."
          : "Not stated in the resume."
      : "Not advertised for this post.",
    finding: advertisedSkills.length
      ? strong
        ? "Advertised skills are evidenced in recent work."
        : mid
          ? "Some advertised skills appear; others are missing."
          : "Advertised skills are not evidenced."
      : "Not advertised for this post.",
  };

  const roleFit: ScreeningParameterResult = {
    id: "ROLE_FIT",
    verdict: strong ? "MET" : mid ? "PARTIAL" : "NOT_EVIDENCED",
    score: clampScore(intendedScore + (strong ? -2 : mid ? -8 : -10)),
    requirement: job.title,
    evidence: strong
      ? "Recent responsibilities overlap with the advertised duties."
      : mid
        ? "Some adjacent work is described, but not the core duties of this post."
        : "Not stated in the resume.",
    finding: strong
      ? `The work described is a close match for ${job.title}.`
      : mid
        ? "Role relevance is mixed: adjacent experience, not a direct match."
        : "Little of the described work matches this post.",
  };

  const parameters = [education, field, experience, skills, roleFit];
  const matchScore = intendedScore;
  const recommendation = recommendationFromScore(matchScore);
  const matchedSkills = strong
    ? advertisedSkills
    : mid
      ? advertisedSkills.slice(0, 1)
      : [];
  const missingSkills = advertisedSkills.filter((skill) => !matchedSkills.includes(skill));

  return {
    matchScore,
    recommendation,
    summary: strong
      ? `${fullName}'s resume clearly meets the stated requirements for ${job.title}, with directly relevant experience.`
      : mid
        ? `${fullName}'s resume meets much of the requirement for ${job.title}, but a real gap remains.`
        : `${fullName}'s resume shows little relevant evidence against the stated requirements for ${job.title}.`,
    strengths: strong
      ? [
          "Qualification and field of study are explicitly stated.",
          "Recent work maps onto the advertised duties.",
        ]
      : mid
        ? ["Some relevant qualification or skills are present."]
        : ["Limited job-relevant evidence on the resume."],
    gaps: strong
      ? ["Recruiter should still verify original documents."]
      : mid
        ? ["Experience or skills only partly match the advertisement."]
        : ["Core advertised requirements are not evidenced."],
    matchedSkills,
    missingSkills,
    parameters,
    confidence: strong ? "HIGH" : mid ? "MEDIUM" : "LOW",
  };
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
