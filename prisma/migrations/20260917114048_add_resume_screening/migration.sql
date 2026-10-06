-- CreateTable
CREATE TABLE "ResumeScreening" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "matchScore" INTEGER,
    "recommendation" TEXT,
    "summary" TEXT,
    "strengths" TEXT,
    "gaps" TEXT,
    "matchedSkills" TEXT,
    "missingSkills" TEXT,
    "resumeDocumentId" TEXT,
    "extractionMethod" TEXT,
    "modelName" TEXT,
    "promptVersion" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "error" TEXT,
    "scannedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ResumeScreening_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ResumeScreening_applicationId_key" ON "ResumeScreening"("applicationId");

-- CreateIndex
CREATE INDEX "ResumeScreening_status_idx" ON "ResumeScreening"("status");

-- CreateIndex
CREATE INDEX "ResumeScreening_matchScore_idx" ON "ResumeScreening"("matchScore");
