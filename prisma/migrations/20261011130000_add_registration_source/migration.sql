-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_StudentSubjectRegistration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentSubjectRegistration_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudentSubjectRegistration_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudentSubjectRegistration_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudentSubjectRegistration_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_StudentSubjectRegistration" ("academicYearId", "createdAt", "id", "schoolId", "studentId", "subjectId") SELECT "academicYearId", "createdAt", "id", "schoolId", "studentId", "subjectId" FROM "StudentSubjectRegistration";
DROP TABLE "StudentSubjectRegistration";
ALTER TABLE "new_StudentSubjectRegistration" RENAME TO "StudentSubjectRegistration";
CREATE INDEX "StudentSubjectRegistration_studentId_academicYearId_idx" ON "StudentSubjectRegistration"("studentId", "academicYearId");
CREATE INDEX "StudentSubjectRegistration_subjectId_idx" ON "StudentSubjectRegistration"("subjectId");
CREATE INDEX "StudentSubjectRegistration_schoolId_subjectId_source_idx" ON "StudentSubjectRegistration"("schoolId", "subjectId", "source");
CREATE UNIQUE INDEX "StudentSubjectRegistration_studentId_subjectId_academicYearId_key" ON "StudentSubjectRegistration"("studentId", "subjectId", "academicYearId");

-- Backfill: registrations that currently match a compulsory assignment become
-- auto-managed (COMPULSORY); everything else remains a MANUAL selection.
UPDATE "StudentSubjectRegistration"
SET "source" = 'COMPULSORY'
WHERE EXISTS (
    SELECT 1
    FROM "SubjectClass" sc
    JOIN "Student" st ON st."id" = "StudentSubjectRegistration"."studentId"
    WHERE sc."subjectId" = "StudentSubjectRegistration"."subjectId"
      AND sc."classLevelId" = st."classLevelId"
      AND (sc."streamId" IS NULL OR sc."streamId" = st."streamId")
);
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
