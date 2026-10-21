-- CreateTable
CREATE TABLE "SubjectClass" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "classLevelId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubjectClass_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SubjectClass_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SubjectClass_classLevelId_fkey" FOREIGN KEY ("classLevelId") REFERENCES "ClassLevel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "SubjectClass_schoolId_idx" ON "SubjectClass"("schoolId");

-- CreateIndex
CREATE INDEX "SubjectClass_classLevelId_idx" ON "SubjectClass"("classLevelId");

-- CreateIndex
CREATE UNIQUE INDEX "SubjectClass_subjectId_classLevelId_key" ON "SubjectClass"("subjectId", "classLevelId");
