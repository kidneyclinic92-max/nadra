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

  console.log("Creating applications…");
  const candidates = await prisma.candidate.findMany({
    include: { educations: true, experiences: true },
  });
  const openJobs = jobs.filter((job) => job.status === "OPEN");

  let applicationCount = 0;
  for (const candidate of candidates) {
    // Each candidate applies to the two positions they match best, which gives
    // the shortlisting screen a realistic spread of strong and weak applicants.
    const ranked = openJobs
      .map((job) => ({ job, result: evaluateEligibility(candidate, job) }))
      .sort((a, b) => b.result.score - a.result.score)
      .slice(0, 2);

    for (const { job, result } of ranked) {
      await prisma.application.create({
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
    }
  }

  console.log(
    `\nSeed complete: ${jobs.length} positions, ${candidates.length} candidates, ${applicationCount} applications.`,
  );
  console.log("\nDemo sign-in details (development only):");
  console.log(`  Admin      admin@recruitment.gov.pk      / ${DEMO_PASSWORD}`);
  console.log(`  Recruiter  recruiter@recruitment.gov.pk  / ${DEMO_PASSWORD}`);
  console.log(`  Candidate  ayesha.khan@example.com       / ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
