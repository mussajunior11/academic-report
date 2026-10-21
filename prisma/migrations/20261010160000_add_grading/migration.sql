-- CreateTable
CREATE TABLE "Grade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "minScore" INTEGER NOT NULL,
    "maxScore" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Grade_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Division" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "minScore" INTEGER NOT NULL,
    "maxScore" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Division_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SchoolSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "schoolName" TEXT,
    "address" TEXT,
    "mobile1" TEXT,
    "mobile2" TEXT,
    "mobile3" TEXT,
    "email" TEXT,
    "website" TEXT,
    "poBox" TEXT,
    "logoUrl" TEXT,
    "logoUpdatedAt" DATETIME,
    "defaultAcademicYearId" TEXT,
    "passMark" INTEGER NOT NULL DEFAULT 40,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SchoolSettings_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SchoolSettings_defaultAcademicYearId_fkey" FOREIGN KEY ("defaultAcademicYearId") REFERENCES "AcademicYear" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_SchoolSettings" ("address", "createdAt", "defaultAcademicYearId", "email", "id", "logoUpdatedAt", "logoUrl", "mobile1", "mobile2", "mobile3", "poBox", "schoolId", "schoolName", "updatedAt", "website") SELECT "address", "createdAt", "defaultAcademicYearId", "email", "id", "logoUpdatedAt", "logoUrl", "mobile1", "mobile2", "mobile3", "poBox", "schoolId", "schoolName", "updatedAt", "website" FROM "SchoolSettings";
DROP TABLE "SchoolSettings";
ALTER TABLE "new_SchoolSettings" RENAME TO "SchoolSettings";
CREATE UNIQUE INDEX "SchoolSettings_schoolId_key" ON "SchoolSettings"("schoolId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Grade_schoolId_idx" ON "Grade"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Grade_schoolId_code_key" ON "Grade"("schoolId", "code");

-- CreateIndex
CREATE INDEX "Division_schoolId_idx" ON "Division"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Division_schoolId_code_key" ON "Division"("schoolId", "code");