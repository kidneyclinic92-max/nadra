-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "guardianName" TEXT NOT NULL,
    "guardianRelation" TEXT NOT NULL DEFAULT 'FATHER',
    "cnic" TEXT NOT NULL,
    "dateOfBirth" DATETIME,
    "gender" TEXT,
    "maritalStatus" TEXT,
    "religion" TEXT,
    "nationality" TEXT NOT NULL DEFAULT 'Pakistani',
    "mobile" TEXT NOT NULL,
    "alternateMobile" TEXT,
    "contactEmail" TEXT,
    "linkedinUrl" TEXT,
    "portfolioUrl" TEXT,
    "currentAddress" TEXT,
    "permanentAddress" TEXT,
    "city" TEXT,
    "province" TEXT,
    "postalCode" TEXT,
    "domicileDistrict" TEXT,
    "domicileProvince" TEXT,
    "quotaCategory" TEXT NOT NULL DEFAULT 'OPEN_MERIT',
    "hasDisability" BOOLEAN NOT NULL DEFAULT false,
    "disabilityDetails" TEXT,
    "isProfileComplete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Candidate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Education" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "candidateId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "degreeTitle" TEXT NOT NULL,
    "majorSubjects" TEXT,
    "institution" TEXT NOT NULL,
    "boardOrUniversity" TEXT,
    "startYear" INTEGER,
    "passingYear" INTEGER NOT NULL,
    "resultType" TEXT NOT NULL DEFAULT 'MARKS',
    "obtainedMarks" REAL,
    "totalMarks" REAL,
    "cgpa" REAL,
    "maxCgpa" REAL,
    "grade" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Education_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Experience" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "candidateId" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "department" TEXT,
    "employmentType" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "responsibilities" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Experience_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "candidateId" TEXT NOT NULL,
    "educationId" TEXT,
    "experienceId" TEXT,
    "type" TEXT NOT NULL,
    "label" TEXT,
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Document_educationId_fkey" FOREIGN KEY ("educationId") REFERENCES "Education" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Document_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "department" TEXT,
    "description" TEXT NOT NULL,
    "responsibilities" TEXT,
    "city" TEXT,
    "province" TEXT,
    "employmentType" TEXT NOT NULL DEFAULT 'FULL_TIME',
    "positions" INTEGER NOT NULL DEFAULT 1,
    "payScale" TEXT,
    "minEducationLevel" TEXT,
    "requiredDegreeTitle" TEXT,
    "minExperienceYears" INTEGER NOT NULL DEFAULT 0,
    "minAge" INTEGER,
    "maxAge" INTEGER,
    "genderRequirement" TEXT NOT NULL DEFAULT 'ANY',
    "domicileRestriction" TEXT NOT NULL DEFAULT 'ANY',
    "requiredSkills" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "openingDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closingDate" DATETIME,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Job_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "coverNote" TEXT,
    "recruiterNotes" TEXT,
    "eligibilityScore" INTEGER NOT NULL DEFAULT 0,
    "reviewedById" TEXT,
    "reviewedAt" DATETIME,
    "appliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Application_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Application_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Application_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Candidate_userId_key" ON "Candidate"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Candidate_cnic_key" ON "Candidate"("cnic");

-- CreateIndex
CREATE INDEX "Candidate_province_idx" ON "Candidate"("province");

-- CreateIndex
CREATE INDEX "Candidate_domicileProvince_idx" ON "Candidate"("domicileProvince");

-- CreateIndex
CREATE INDEX "Candidate_quotaCategory_idx" ON "Candidate"("quotaCategory");

-- CreateIndex
CREATE INDEX "Candidate_fullName_idx" ON "Candidate"("fullName");

-- CreateIndex
CREATE INDEX "Education_candidateId_idx" ON "Education"("candidateId");

-- CreateIndex
CREATE INDEX "Education_level_idx" ON "Education"("level");

-- CreateIndex
CREATE INDEX "Education_passingYear_idx" ON "Education"("passingYear");

-- CreateIndex
CREATE INDEX "Experience_candidateId_idx" ON "Experience"("candidateId");

-- CreateIndex
CREATE INDEX "Document_candidateId_idx" ON "Document"("candidateId");

-- CreateIndex
CREATE INDEX "Document_type_idx" ON "Document"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Job_code_key" ON "Job"("code");

-- CreateIndex
CREATE INDEX "Job_status_idx" ON "Job"("status");

-- CreateIndex
CREATE INDEX "Job_closingDate_idx" ON "Job"("closingDate");

-- CreateIndex
CREATE INDEX "Application_jobId_status_idx" ON "Application"("jobId", "status");

-- CreateIndex
CREATE INDEX "Application_candidateId_idx" ON "Application"("candidateId");

-- CreateIndex
CREATE INDEX "Application_status_idx" ON "Application"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Application_jobId_candidateId_key" ON "Application"("jobId", "candidateId");
