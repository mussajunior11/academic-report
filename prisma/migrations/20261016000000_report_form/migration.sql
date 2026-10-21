-- Report form support: grade points & status remarks, points-based divisions,
-- a configurable required-subject count, and per-student report remarks.

-- AlterTable: grade points + status remark
ALTER TABLE "Grade" ADD COLUMN "points" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Grade" ADD COLUMN "remark" TEXT;
UPDATE "Grade" SET "points" = CASE "code"
    WHEN 'A' THEN 1
    WHEN 'B' THEN 2
    WHEN 'C' THEN 3
    WHEN 'D' THEN 4
    ELSE 5 END;
UPDATE "Grade" SET "remark" = CASE "code"
    WHEN 'A' THEN 'Excellent'
    WHEN 'B' THEN 'Very Good'
    WHEN 'C' THEN 'Good'
    WHEN 'D' THEN 'Satisfactory'
    ELSE 'Poor' END;

-- AlterTable: required graded subjects counted when classifying a division
ALTER TABLE "SchoolSettings" ADD COLUMN "divisionSubjects" INTEGER NOT NULL DEFAULT 7;

-- RedefineTables: division bands move from average score to total points
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Division" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "minPoints" INTEGER NOT NULL,
    "maxPoints" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Division_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Division" ("id", "schoolId", "code", "minPoints", "maxPoints", "sortOrder", "createdAt", "updatedAt")
SELECT "id", "schoolId", "code",
    CASE "code"
        WHEN 'I' THEN 7
        WHEN 'II' THEN 18
        WHEN 'III' THEN 22
        WHEN 'IV' THEN 26
        ELSE 34 END,
    CASE "code"
        WHEN 'I' THEN 17
        WHEN 'II' THEN 21
        WHEN 'III' THEN 25
        WHEN 'IV' THEN 33
        ELSE 35 END,
    "sortOrder", "createdAt", "updatedAt"
FROM "Division";
DROP TABLE "Division";
ALTER TABLE "new_Division" RENAME TO "Division";
CREATE INDEX "Division_schoolId_idx" ON "Division"("schoolId");
CREATE UNIQUE INDEX "Division_schoolId_code_key" ON "Division"("schoolId", "code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateTable: per-student examination report remarks
CREATE TABLE "ReportRemark" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "examinationId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "academicMaster" TEXT,
    "headMaster" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReportRemark_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReportRemark_examinationId_fkey" FOREIGN KEY ("examinationId") REFERENCES "Examination" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReportRemark_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ReportRemark_schoolId_examinationId_idx" ON "ReportRemark"("schoolId", "examinationId");

-- CreateIndex
CREATE INDEX "ReportRemark_studentId_idx" ON "ReportRemark"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "ReportRemark_examinationId_studentId_key" ON "ReportRemark"("examinationId", "studentId");
