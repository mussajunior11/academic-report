-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Student" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "admissionNumber" TEXT,
    "studentNumber" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "classLevelId" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "admissionYear" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "specialNeeds" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Student_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Student_classLevelId_fkey" FOREIGN KEY ("classLevelId") REFERENCES "ClassLevel" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Student_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Student" ("admissionNumber", "admissionYear", "archivedAt", "classLevelId", "createdAt", "fullName", "gender", "id", "schoolId", "status", "streamId", "studentNumber", "updatedAt") SELECT "admissionNumber", "admissionYear", "archivedAt", "classLevelId", "createdAt", "fullName", "gender", "id", "schoolId", "status", "streamId", "studentNumber", "updatedAt" FROM "Student";
DROP TABLE "Student";
ALTER TABLE "new_Student" RENAME TO "Student";
CREATE INDEX "Student_schoolId_status_archivedAt_idx" ON "Student"("schoolId", "status", "archivedAt");
CREATE INDEX "Student_classLevelId_streamId_idx" ON "Student"("classLevelId", "streamId");
CREATE INDEX "Student_fullName_idx" ON "Student"("fullName");
CREATE INDEX "Student_createdAt_idx" ON "Student"("createdAt");
CREATE UNIQUE INDEX "Student_schoolId_studentNumber_key" ON "Student"("schoolId", "studentNumber");
CREATE UNIQUE INDEX "Student_schoolId_admissionNumber_key" ON "Student"("schoolId", "admissionNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
