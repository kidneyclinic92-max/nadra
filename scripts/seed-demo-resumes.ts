/**
 * Development helper: generates a resume PDF for every seeded candidate and
 * attaches it as a RESUME document.
 *
 * `prisma/seed.ts` creates candidates and applications but no uploads, which
 * leaves AI screening with nothing to read. Each resume here is built from the
 * candidate's own education and experience rows, so the model's scores stay
 * consistent with the eligibility data the rest of the app already shows.
 *
 * Contact details are included on purpose: they give the redaction layer
 * something real to strip before anything reaches the model.
 *
 * Run with: npm run db:seed-resumes [-- --force]
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  }),
});

const UPLOAD_ROOT = path.resolve(
  process.env.UPLOAD_DIR ?? path.join(process.cwd(), "storage", "uploads"),
);

const FORCE = process.argv.includes("--force");

// ---------------------------------------------------------------- PDF writing

const PAGE_WIDTH = 595; // A4 at 72dpi
const PAGE_HEIGHT = 842;
const MARGIN = 54;
const USABLE = PAGE_WIDTH - MARGIN * 2;

type Block =
  | { kind: "title"; text: string }
  | { kind: "contact"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "subheading"; text: string; right?: string }
  | { kind: "body"; text: string }
  | { kind: "bullet"; text: string }
  | { kind: "space" };

const STYLES = {
  title: { font: "F2", size: 17, leading: 22 },
  contact: { font: "F1", size: 9, leading: 13 },
  heading: { font: "F2", size: 10.5, leading: 18 },
  subheading: { font: "F2", size: 10, leading: 14 },
  body: { font: "F1", size: 9.5, leading: 13 },
  bullet: { font: "F1", size: 9.5, leading: 13 },
} as const;

/** Helvetica is ~0.5em average; 0.54 keeps wrapped lines clear of the margin. */
function wrap(text: string, size: number, width: number): string[] {
  const maxChars = Math.max(8, Math.floor(width / (size * 0.54)));
  const lines: string[] = [];
  let current = "";

  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

function escapePdf(text: string): string {
  return text.replace(/([()\\])/g, "\\$1");
}

/** Strips anything outside WinAnsi's safe ASCII range. */
function toAscii(text: string): string {
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^\x20-\x7e]/g, "");
}

type Line = { text: string; font: string; size: number; x: number; y: number };

/** Lays blocks out into positioned lines, breaking pages as needed. */
function layout(blocks: Block[]): Line[][] {
  const pages: Line[][] = [];
  let page: Line[] = [];
  let y = PAGE_HEIGHT - MARGIN;

  const newPage = () => {
    pages.push(page);
    page = [];
    y = PAGE_HEIGHT - MARGIN;
  };

  for (const block of blocks) {
    if (block.kind === "space") {
      y -= 7;
      continue;
    }

    const style = STYLES[block.kind];
    const indent = block.kind === "bullet" ? 14 : 0;
    const text = toAscii(block.text);

    // A heading stranded at the foot of a page reads as a mistake.
    const needed = block.kind === "heading" ? style.leading * 2.5 : style.leading;
    if (y - needed < MARGIN) newPage();

    if (block.kind === "heading") {
      y -= style.leading;
      page.push({ text, font: style.font, size: style.size, x: MARGIN, y });
      // Underline the section using a run of hyphens; avoids a graphics stream.
      y -= 3;
      page.push({
        text: "-".repeat(Math.floor(USABLE / (7 * 0.54))),
        font: "F1",
        size: 7,
        x: MARGIN,
        y,
      });
      continue;
    }

    if (block.kind === "subheading" && block.right) {
      y -= style.leading;
      page.push({ text, font: style.font, size: style.size, x: MARGIN, y });
      const right = toAscii(block.right);
      // Right-align by estimating the rendered width.
      const estimated = right.length * 9 * 0.5;
      page.push({
        text: right,
        font: "F1",
        size: 9,
        x: PAGE_WIDTH - MARGIN - estimated,
        y,
      });
      continue;
    }

    const prefixed = block.kind === "bullet" ? `- ${text}` : text;
    const lines = wrap(prefixed, style.size, USABLE - indent);

    lines.forEach((line, index) => {
      if (y - style.leading < MARGIN) newPage();
      y -= style.leading;
      page.push({
        text: line,
        font: style.font,
        size: style.size,
        // Hanging indent so wrapped bullet text aligns under the first word.
        x: MARGIN + indent + (block.kind === "bullet" && index > 0 ? 9 : 0),
        y,
      });
    });
  }

  pages.push(page);
  return pages.filter((p) => p.length > 0);
}

function buildPdf(blocks: Block[]): Buffer {
  const pages = layout(blocks);

  const streams = pages.map((lines) => {
    const parts = ["BT"];
    let currentFont = "";
    let currentSize = 0;

    for (const line of lines) {
      if (line.font !== currentFont || line.size !== currentSize) {
        parts.push(`/${line.font} ${line.size} Tf`);
        currentFont = line.font;
        currentSize = line.size;
      }
      parts.push(
        `1 0 0 1 ${line.x.toFixed(2)} ${line.y.toFixed(2)} Tm (${escapePdf(line.text)}) Tj`,
      );
    }

    parts.push("ET");
    return parts.join("\n");
  });

  // Object numbering: 1 catalog, 2 pages, 3..(2+n) pages, then contents, fonts.
  const pageCount = pages.length;
  const firstPageObj = 3;
  const firstContentObj = firstPageObj + pageCount;
  const fontRegularObj = firstContentObj + pageCount;
  const fontBoldObj = fontRegularObj + 1;

  const objects: string[] = [];
  objects.push("<</Type/Catalog/Pages 2 0 R>>");
  objects.push(
    `<</Type/Pages/Kids[${pages
      .map((_, i) => `${firstPageObj + i} 0 R`)
      .join(" ")}]/Count ${pageCount}>>`,
  );

  pages.forEach((_, i) => {
    objects.push(
      `<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}]` +
        `/Contents ${firstContentObj + i} 0 R` +
        `/Resources<</Font<</F1 ${fontRegularObj} 0 R/F2 ${fontBoldObj} 0 R>>>>>>`,
    );
  });

  streams.forEach((stream) => {
    objects.push(
      `<</Length ${Buffer.byteLength(stream, "latin1")}>>\nstream\n${stream}\nendstream`,
    );
  });

  objects.push("<</Type/Font/Subtype/Type1/BaseFont/Helvetica/Encoding/WinAnsiEncoding>>");
  objects.push(
    "<</Type/Font/Subtype/Type1/BaseFont/Helvetica-Bold/Encoding/WinAnsiEncoding>>",
  );

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf +=
    `trailer\n<</Size ${objects.length + 1}/Root 1 0 R>>\n` +
    `startxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, "latin1");
}

// ------------------------------------------------------- per-candidate detail

type ResumeExtras = {
  summary: string;
  skills: string[];
  /** Extra achievement bullets, keyed by the seeded designation. */
  achievements: Record<string, string[]>;
  certifications?: string[];
};

const EXTRAS: Record<string, ResumeExtras> = {
  "ayesha.khan@example.com": {
    summary:
      "Software engineer with four years building internal reporting and line-of-business systems. Comfortable owning a feature from database schema through to release, with a focus on data migration and reporting accuracy.",
    skills: [
      "SQL",
      "TypeScript",
      "React",
      "Node.js",
      "PostgreSQL",
      "Power BI",
      "Git",
      "REST APIs",
      "data migration",
    ],
    achievements: {
      "Software Engineer": [
        "Led the data migration for the HR module, moving 40,000 employee records with a reconciliation step that cut post-migration defects to zero.",
        "Built an internal reporting tool in TypeScript and SQL now used by four departments for monthly returns.",
        "Rewrote the nightly ETL job, reducing its runtime from three hours to under twenty minutes.",
        "Mentored two junior engineers and introduced pull request review to the team.",
      ],
    },
    certifications: [
      "Microsoft Certified: Azure Data Fundamentals (2023)",
      "Google Data Analytics Professional Certificate (2022)",
    ],
  },
  "bilal.ahmed@example.com": {
    summary:
      "Electrical engineer with eight years in power distribution operations, focused on grid maintenance planning, substation upgrade delivery and vendor management.",
    skills: [
      "grid operations",
      "SCADA",
      "substation maintenance",
      "vendor management",
      "project scheduling",
      "MS Project",
      "AutoCAD",
      "HSE compliance",
    ],
    achievements: {
      "Assistant Manager Operations": [
        "Managed preventive maintenance scheduling across 60 feeders, improving on-time completion from 71% to 94%.",
        "Delivered three substation upgrade projects within budget, coordinating six external vendors.",
        "Introduced a fault logging process that shortened average restoration time by 18%.",
        "Supervised a field team of twelve technicians and ran their safety induction programme.",
      ],
    },
    certifications: ["Registered Engineer, Pakistan Engineering Council"],
  },
  "fatima.zahra@example.com": {
    summary:
      "Research officer specialising in evidence-based policy formulation for provincial government programmes. Experienced in drafting policy briefs, running stakeholder consultations and analysing programme monitoring data.",
    skills: [
      "policy analysis",
      "research design",
      "report writing",
      "stakeholder consultation",
      "monitoring and evaluation",
      "SPSS",
      "Stata",
      "survey design",
      "quantitative analysis",
    ],
    achievements: {
      "Research Officer": [
        "Authored fourteen policy briefs for the Planning & Development department, three of which informed approved provincial schemes.",
        "Designed and analysed a district level service delivery survey covering 1,200 households.",
        "Coordinated consultations with eleven provincial stakeholder bodies and consolidated their input into a single reform proposal.",
        "Built the monitoring framework and quarterly indicator reporting for a donor funded health programme.",
      ],
    },
    certifications: [
      "Certificate in Monitoring & Evaluation, Pakistan Institute of Development Economics (2022)",
    ],
  },
  "usman.tariq@example.com": {
    summary:
      "Recent software engineering graduate seeking a first professional role. Strong academic record with coursework and projects in databases, web development and data structures. No professional experience yet.",
    skills: [
      "Java",
      "Python",
      "JavaScript",
      "React",
      "SQL",
      "Git",
      "data structures",
      "object oriented design",
      "unit testing",
    ],
    achievements: {},
    certifications: ["Meta Front-End Developer Certificate (2025)"],
  },
  "hina.baloch@example.com": {
    summary:
      "Audit associate with two years of external audit experience across statutory engagements, reconciliation and financial reporting. Familiar with preparing audit files and working with client finance teams.",
    skills: [
      "external audit",
      "reconciliation",
      "financial reporting",
      "IFRS",
      "budget preparation",
      "variance analysis",
      "QuickBooks",
      "advanced Excel",
      "SQL reporting",
    ],
    achievements: {
      "Audit Associate": [
        "Completed statutory audits for nine clients across manufacturing and services as part of a four person team.",
        "Rebuilt the bank reconciliation process for a retail client, clearing an eleven month backlog.",
        "Prepared audit files and supporting schedules reviewed directly by the engagement partner.",
        "Automated a recurring receivables ageing report using SQL and Excel, saving roughly two days a month.",
      ],
    },
    certifications: ["ACCA, 9 of 13 papers completed"],
  },
  "imran.shah@example.com": {
    summary:
      "Retired Junior Commissioned Officer with twenty years of service in logistics coordination, personnel management and training delivery. Seeking a civilian administrative role.",
    skills: [
      "logistics coordination",
      "inventory control",
      "personnel management",
      "training delivery",
      "fleet management",
      "store accounting",
      "discipline administration",
    ],
    achievements: {
      "Junior Commissioned Officer": [
        "Coordinated supply and transport for a unit of 400 personnel across three field deployments.",
        "Maintained store accounts and inventory records with no audit observations over six consecutive years.",
        "Delivered induction and refresher training to more than 200 personnel.",
        "Managed a vehicle fleet of eighteen units including maintenance scheduling and fuel accounting.",
      ],
    },
  },
};

const LEVEL_LABEL: Record<string, string> = {
  MATRIC: "Matriculation",
  INTERMEDIATE: "Intermediate",
  DIPLOMA: "Diploma",
  BACHELORS: "Bachelors",
  MASTERS: "Masters",
  MPHIL: "MPhil",
  PHD: "PhD",
};

function formatResult(education: {
  resultType: string;
  cgpa: number | null;
  maxCgpa: number | null;
  obtainedMarks: number | null;
  totalMarks: number | null;
}): string | null {
  if (education.resultType === "CGPA" && education.cgpa != null) {
    return `CGPA ${education.cgpa}/${education.maxCgpa ?? 4}`;
  }
  if (
    education.resultType === "MARKS" &&
    education.obtainedMarks != null &&
    education.totalMarks != null
  ) {
    const percent = Math.round(
      (education.obtainedMarks / education.totalMarks) * 100,
    );
    return `${education.obtainedMarks}/${education.totalMarks} (${percent}%)`;
  }
  return null;
}

type CandidateRecord = {
  id: string;
  fullName: string;
  contactEmail: string | null;
  mobile: string;
  city: string;
  linkedinUrl: string | null;
  user: { email: string };
  educations: {
    level: string;
    degreeTitle: string;
    majorSubjects: string | null;
    institution: string;
    boardOrUniversity: string;
    passingYear: number;
    resultType: string;
    cgpa: number | null;
    maxCgpa: number | null;
    obtainedMarks: number | null;
    totalMarks: number | null;
  }[];
  experiences: {
    organization: string;
    designation: string;
    employmentType: string;
    startDate: Date;
    endDate: Date | null;
    isCurrent: boolean;
    responsibilities: string | null;
  }[];
};

function buildBlocks(candidate: CandidateRecord): Block[] {
  const extras = EXTRAS[candidate.user.email];
  const blocks: Block[] = [];

  blocks.push({ kind: "title", text: candidate.fullName });
  blocks.push({
    kind: "contact",
    text: [
      candidate.contactEmail ?? candidate.user.email,
      candidate.mobile,
      candidate.city,
      candidate.linkedinUrl,
    ]
      .filter(Boolean)
      .join("  |  "),
  });

  if (extras?.summary) {
    blocks.push({ kind: "space" });
    blocks.push({ kind: "heading", text: "PROFESSIONAL SUMMARY" });
    blocks.push({ kind: "body", text: extras.summary });
  }

  const experiences = [...candidate.experiences].sort(
    (a, b) => b.startDate.getTime() - a.startDate.getTime(),
  );

  if (experiences.length > 0) {
    blocks.push({ kind: "space" });
    blocks.push({ kind: "heading", text: "PROFESSIONAL EXPERIENCE" });

    for (const experience of experiences) {
      const start = experience.startDate.getFullYear();
      const end = experience.isCurrent
        ? "Present"
        : (experience.endDate?.getFullYear() ?? "Present");

      blocks.push({
        kind: "subheading",
        text: `${experience.designation}, ${experience.organization}`,
        right: `${start} - ${end}`,
      });

      const bullets = extras?.achievements[experience.designation];
      if (bullets && bullets.length > 0) {
        for (const bullet of bullets) blocks.push({ kind: "bullet", text: bullet });
      } else if (experience.responsibilities) {
        blocks.push({ kind: "body", text: experience.responsibilities });
      }
      blocks.push({ kind: "space" });
    }
  }

  if (candidate.educations.length > 0) {
    blocks.push({ kind: "heading", text: "EDUCATION" });

    const educations = [...candidate.educations].sort(
      (a, b) => b.passingYear - a.passingYear,
    );

    for (const education of educations) {
      blocks.push({
        kind: "subheading",
        text: education.degreeTitle,
        right: String(education.passingYear),
      });

      const detail = [
        education.institution,
        education.boardOrUniversity !== education.institution
          ? education.boardOrUniversity
          : null,
        LEVEL_LABEL[education.level] ?? education.level,
        formatResult(education),
      ]
        .filter(Boolean)
        .join("  |  ");

      blocks.push({ kind: "body", text: detail });
      if (education.majorSubjects) {
        blocks.push({ kind: "body", text: `Major subjects: ${education.majorSubjects}` });
      }
      blocks.push({ kind: "space" });
    }
  }

  if (extras?.skills.length) {
    blocks.push({ kind: "heading", text: "SKILLS" });
    blocks.push({ kind: "body", text: extras.skills.join(", ") });
    blocks.push({ kind: "space" });
  }

  if (extras?.certifications?.length) {
    blocks.push({ kind: "heading", text: "CERTIFICATIONS" });
    for (const certification of extras.certifications) {
      blocks.push({ kind: "bullet", text: certification });
    }
  }

  return blocks;
}

async function main() {
  const candidates = (await prisma.candidate.findMany({
    include: {
      user: { select: { email: true } },
      educations: true,
      experiences: true,
      documents: {
        where: { type: "RESUME" },
        select: { id: true, storedName: true },
      },
    },
    orderBy: { fullName: "asc" },
  })) as unknown as (CandidateRecord & {
    documents: { id: string; storedName: string }[];
  })[];

  console.log(`upload root: ${UPLOAD_ROOT}`);
  console.log(`candidates:  ${candidates.length}\n`);

  let created = 0;
  let skipped = 0;

  for (const candidate of candidates) {
    if (candidate.documents.length > 0) {
      if (!FORCE) {
        console.log(`  skip    ${candidate.fullName} — already has a resume`);
        skipped += 1;
        continue;
      }

      // Replace rather than accumulate: screening reads the newest resume, so
      // leaving the old rows behind would just grow the table on every re-run.
      for (const existing of candidate.documents) {
        await rm(path.resolve(UPLOAD_ROOT, existing.storedName), { force: true });
      }
      await prisma.document.deleteMany({
        where: { id: { in: candidate.documents.map((d) => d.id) } },
      });
    }

    const pdf = buildPdf(buildBlocks(candidate));

    // Mirrors saveUpload(): random filename under a per-candidate directory.
    const storedName = path.posix.join(candidate.id, `${randomUUID()}.pdf`);
    const absolutePath = path.resolve(UPLOAD_ROOT, storedName);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, pdf);

    const originalName = `${candidate.fullName.replace(/\s+/g, "-").toLowerCase()}-resume.pdf`;

    await prisma.document.create({
      data: {
        candidateId: candidate.id,
        type: "RESUME",
        label: "Resume",
        originalName,
        storedName,
        mimeType: "application/pdf",
        sizeBytes: pdf.length,
        isVerified: false,
      },
    });

    console.log(
      `  created ${candidate.fullName.padEnd(16)} ${String(pdf.length).padStart(6)} bytes  ${originalName}`,
    );
    created += 1;
  }

  console.log(`\n${created} resume(s) created, ${skipped} skipped.`);
  if (skipped > 0 && !FORCE) {
    console.log("Re-run with --force to replace existing resumes.");
  }
}

void main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
