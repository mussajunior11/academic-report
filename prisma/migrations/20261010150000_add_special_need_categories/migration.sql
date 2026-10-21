-- CreateTable
CREATE TABLE "SpecialNeedCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "StudentSpecialNeed" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentSpecialNeed_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudentSpecialNeed_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "SpecialNeedCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

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

-- CreateIndex
CREATE INDEX "SpecialNeedCategory_sortOrder_idx" ON "SpecialNeedCategory"("sortOrder");

-- CreateIndex
CREATE INDEX "StudentSpecialNeed_studentId_idx" ON "StudentSpecialNeed"("studentId");

-- CreateIndex
CREATE INDEX "StudentSpecialNeed_categoryId_idx" ON "StudentSpecialNeed"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentSpecialNeed_studentId_categoryId_key" ON "StudentSpecialNeed"("studentId", "categoryId");

-- Seed the fixed support-need categories (stable ids referenced by the app
-- and validated against the same set in src/lib/constants.ts).
INSERT INTO "SpecialNeedCategory" ("id", "label", "description", "sortOrder") VALUES
  ('visual_impairment', 'Visual Impairment', 'Blindness, low vision, or difficulty seeing standard print.', 1),
  ('hearing_impairment', 'Hearing Impairment', 'Deafness, partial hearing loss, or need for hearing support.', 2),
  ('physical_disability', 'Physical or Mobility Disability', 'Mobility limitations or difficulty using classroom facilities or writing tools.', 3),
  ('learning_difficulties', 'Learning Difficulties', 'Dyslexia, dyscalculia, dysgraphia, or other identified learning difficulties.', 4),
  ('neurodevelopmental_support', 'Neurodevelopmental Support Needs', 'Autism, ADHD, or other identified developmental conditions affecting learning or classroom participation.', 5),
  ('speech_communication', 'Speech and Communication Difficulties', 'Difficulty speaking, understanding language, or communicating effectively.', 6),
  ('intellectual_disability', 'Intellectual Disability', 'An identified intellectual disability requiring additional learning support.', 7),
  ('chronic_health', 'Chronic Health or Medical Needs', 'A documented condition requiring special care; exclude from manual work and punishments.', 8),
  ('social_emotional_behavioural', 'Social, Emotional or Behavioural Support Needs', 'Identified needs requiring additional support with emotional regulation, behaviour, or participation in learning.', 9),
  ('other', 'Other Special Educational Needs', 'A support need that does not fit the categories above. Add a short description.', 10);