-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SubjectClass" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "classLevelId" TEXT NOT NULL,
    "streamId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubjectClass_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SubjectClass_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SubjectClass_classLevelId_fkey" FOREIGN KEY ("classLevelId") REFERENCES "ClassLevel" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SubjectClass_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SubjectClass" ("classLevelId", "createdAt", "id", "schoolId", "subjectId") SELECT "classLevelId", "createdAt", "id", "schoolId", "subjectId" FROM "SubjectClass";
DROP TABLE "SubjectClass";
ALTER TABLE "new_SubjectClass" RENAME TO "SubjectClass";
CREATE INDEX "SubjectClass_schoolId_idx" ON "SubjectClass"("schoolId");
CREATE INDEX "SubjectClass_classLevelId_idx" ON "SubjectClass"("classLevelId");
CREATE INDEX "SubjectClass_streamId_idx" ON "SubjectClass"("streamId");
CREATE UNIQUE INDEX "SubjectClass_subjectId_classLevelId_streamId_key" ON "SubjectClass"("subjectId", "classLevelId", "streamId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
