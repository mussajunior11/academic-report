import "server-only";

import { prisma } from "@/lib/db/prisma";
import { AppError, toFriendlyError } from "@/lib/errors";
import { REGISTRATION_SOURCES } from "@/lib/constants";
import { getPrimarySchool } from "@/lib/services/school";
import type { ParsedMarksWorkbook } from "@/lib/excel/marks-workbook";
import type { SaveMarkInput } from "@/lib/validation/schemas";

async function requireSchool() {
  const school = await getPrimarySchool();
  if (!school) {
    throw new AppError("No school is configured. Run `npm run db:seed` to set up the database.");
  }
  return school;
}

export type MarksEntrySubject = { id: string; name: string; code: string | null; numericCode: string | null };

export type MarksEntryStudent = {
  id: string;
  studentNumber: string;
  admissionNumber: string | null;
  fullName: string;
  gender: string;
  classLevelName: string;
  streamId: string;
  streamName: string;
  /** Subjects the student is registered to take in the examination's year. */
  subjectIds: string[];
};

export type MarksEntry = {
  examination: {
    id: string;
    name: string;
    typeName: string;
    term: string | null;
    status: string;
    classLevelName: string;
    academicYearId: string;
    academicYearName: string;
  };
  subjects: MarksEntrySubject[];
  students: MarksEntryStudent[];
  marks: { studentId: string; subjectId: string; score: number }[];
  /** False when the examination is closed and marks are read-only. */
  canEdit: boolean;
};

/** Round to one decimal place so stored scores match the validation rule. */
export function normalizeScore(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Everything the marks-entry grid needs for one examination: the class's
 * students (with their registered subjects for the examination's year), the
 * subjects to show as columns, and the marks already entered.
 */
export async function getMarksEntry(examinationId: string): Promise<MarksEntry | null> {
  const school = await getPrimarySchool();
  if (!school) return null;

  const exam = await prisma.examination.findFirst({
    where: { id: examinationId, schoolId: school.id },
    include: { type: true, academicYear: true, classLevel: true },
  });
  if (!exam) return null;

  const students = await prisma.student.findMany({
    where: {
      schoolId: school.id,
      archivedAt: null,
      status: "ACTIVE",
      classLevelId: exam.classLevelId,
    },
    orderBy: { fullName: "asc" },
    include: {
      stream: true,
      classLevel: true,
      registrations: {
        where: { academicYearId: exam.academicYearId },
        select: { subjectId: true },
      },
    },
  });

  const studentIds = students.map((s) => s.id);
  const subjectIdSet = new Set<string>();
  for (const student of students) {
    for (const registration of student.registrations) subjectIdSet.add(registration.subjectId);
  }

  const subjects =
    subjectIdSet.size === 0
      ? []
      : await prisma.subject.findMany({
          where: { id: { in: [...subjectIdSet] } },
          orderBy: { name: "asc" },
          select: { id: true, name: true, code: true, numericCode: true },
        });

  const marks =
    studentIds.length === 0
      ? []
      : await prisma.mark.findMany({
          where: { examinationId: exam.id, studentId: { in: studentIds } },
          select: { studentId: true, subjectId: true, score: true },
        });

  return {
    examination: {
      id: exam.id,
      name: exam.name ?? exam.type.name,
      typeName: exam.type.name,
      term: exam.term,
      status: exam.status,
      classLevelName: exam.classLevel.name,
      academicYearId: exam.academicYearId,
      academicYearName: exam.academicYear.name,
    },
    subjects,
    students: students.map((student) => ({
      id: student.id,
      studentNumber: student.studentNumber,
      admissionNumber: student.admissionNumber,
      fullName: student.fullName,
      gender: student.gender,
      classLevelName: student.classLevel.name,
      streamId: student.streamId,
      streamName: student.stream.name,
      subjectIds: student.registrations.map((r) => r.subjectId),
    })),
    marks,
    canEdit: exam.status !== "CLOSED",
  };
}

/** Every examination available for marks entry, newest first. */
export async function listMarksEntryExaminations() {
  const school = await getPrimarySchool();
  if (!school) return [];
  return prisma.examination.findMany({
    where: { schoolId: school.id },
    orderBy: [{ createdAt: "desc" }],
    include: {
      type: true,
      academicYear: true,
      classLevel: true,
      _count: { select: { marks: true } },
    },
  });
}

/**
 * Registers every compulsory subject of the examination's class for each of its
 * active students in the examination's academic year. Whole-class assignments
 * apply to every student; stream-specific assignments apply only to students in
 * that stream. Existing selections (including optional subjects) are preserved.
 * Idempotent — safe to run more than once.
 */
export async function registerCompulsorySubjectsForExamination(examinationId: string) {
  const school = await requireSchool();

  const exam = await prisma.examination.findFirst({
    where: { id: examinationId, schoolId: school.id },
    select: { id: true, classLevelId: true, academicYearId: true },
  });
  if (!exam) throw new AppError("Examination not found.");

  const compulsory = await prisma.subjectClass.findMany({
    where: { classLevelId: exam.classLevelId, subject: { status: "ACTIVE" } },
    select: { subjectId: true, streamId: true },
  });
  if (compulsory.length === 0) return { registered: 0, students: 0 };

  const students = await prisma.student.findMany({
    where: {
      schoolId: school.id,
      classLevelId: exam.classLevelId,
      status: "ACTIVE",
      archivedAt: null,
    },
    select: { id: true, streamId: true },
  });
  if (students.length === 0) return { registered: 0, students: 0 };

  const existing = await prisma.studentSubjectRegistration.findMany({
    where: {
      academicYearId: exam.academicYearId,
      studentId: { in: students.map((s) => s.id) },
    },
    select: { studentId: true, subjectId: true },
  });
  const existingKeys = new Set(existing.map((e) => `${e.studentId}:${e.subjectId}`));

  const data = students.flatMap((student) => {
    const subjectIds = [
      ...new Set(
        compulsory
          .filter((row) => row.streamId === null || row.streamId === student.streamId)
          .map((row) => row.subjectId),
      ),
    ];
    return subjectIds
      .filter((subjectId) => !existingKeys.has(`${student.id}:${subjectId}`))
      .map((subjectId) => ({
        schoolId: school.id,
        studentId: student.id,
        subjectId,
        academicYearId: exam.academicYearId,
        source: REGISTRATION_SOURCES[0],
      }));
  });

  if (data.length > 0) {
    await prisma.studentSubjectRegistration.createMany({ data });
  }

  return { registered: data.length, students: students.length };
}

/**
 * Creates, updates or clears a single mark. Enforces that the examination is
 * open, the student belongs to the examination's class, and the subject is
 * registered for the student in the examination's academic year. The expected
 * score is compared inside a transaction to detect concurrent edits.
 */
export async function saveMark(input: SaveMarkInput) {
  const school = await requireSchool();

  const exam = await prisma.examination.findFirst({
    where: { id: input.examinationId, schoolId: school.id },
    select: { id: true, status: true, classLevelId: true, academicYearId: true },
  });
  if (!exam) throw new AppError("Examination not found.");
  if (exam.status === "CLOSED") {
    throw new AppError("This examination is closed. Reopen it to enter marks.");
  }

  const student = await prisma.student.findFirst({
    where: { id: input.studentId, schoolId: school.id, archivedAt: null },
    select: { id: true, classLevelId: true },
  });
  if (!student) throw new AppError("Student not found.");
  if (student.classLevelId !== exam.classLevelId) {
    throw new AppError("This student is not in the examination's class.");
  }

  const registration = await prisma.studentSubjectRegistration.findFirst({
    where: {
      studentId: student.id,
      subjectId: input.subjectId,
      academicYearId: exam.academicYearId,
    },
    select: { id: true },
  });
  if (!registration) {
    throw new AppError("This subject is not registered for the student in this academic year.");
  }

  const where = {
    examinationId_studentId_subjectId: {
      examinationId: exam.id,
      studentId: student.id,
      subjectId: input.subjectId,
    },
  };

  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.mark.findUnique({ where, select: { score: true } });
      const current = existing ? existing.score : null;
      const expected = input.expectedScore ?? null;

      if (expected !== current) {
        throw new AppError("This mark was changed by someone else. Reload the page and try again.");
      }

      if (input.score === null) {
        if (existing) await tx.mark.delete({ where });
        return { score: null as number | null };
      }

      const score = normalizeScore(input.score);
      const saved = await tx.mark.upsert({
        where,
        create: {
          schoolId: school.id,
          examinationId: exam.id,
          studentId: student.id,
          subjectId: input.subjectId,
          score,
        },
        update: { score },
        select: { score: true },
      });
      return { score: saved.score };
    });
  } catch (error) {
    throw toFriendlyError(error);
  }
}

export type MarkImportSummary = {
  created: number;
  updated: number;
  cleared: number;
  unchanged: number;
  /** Number of rows that were skipped (in full or in part) because of a problem. */
  failed: number;
  issues: { row: number; name: string; error: string }[];
};

const MAX_VALID_SCORE = 100;

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

function parseScore(raw: string): { value: number } | { error: string } {
  const value = Number(raw);
  const valid =
    Number.isFinite(value) &&
    value >= 0 &&
    value <= MAX_VALID_SCORE &&
    Math.abs(value * 10 - Math.round(value * 10)) < 1e-6;
  if (!valid) return { error: "invalid" };
  return { value: Math.round(value * 10) / 10 };
}

/**
 * Applies a filled marks template to an examination. Rows are matched to active
 * students in the examination's class by full name and stream; a score is only
 * accepted for a subject the student is registered to take in that year. A blank
 * cell clears any stored mark for that student and subject. Rows that cannot be
 * matched or contain an invalid score are reported instead of written.
 */
export async function importMarks(
  examinationId: string,
  parsed: ParsedMarksWorkbook,
): Promise<MarkImportSummary> {
  const school = await requireSchool();

  const exam = await prisma.examination.findFirst({
    where: { id: examinationId, schoolId: school.id },
    select: { id: true, status: true, classLevelId: true, academicYearId: true },
  });
  if (!exam) throw new AppError("Examination not found.");
  if (exam.status === "CLOSED") {
    throw new AppError("This examination is closed. Reopen it to enter marks.");
  }

  const [subjects, students] = await Promise.all([
    prisma.subject.findMany({
      where: { schoolId: school.id },
      select: { id: true, name: true, code: true },
    }),
    prisma.student.findMany({
      where: {
        schoolId: school.id,
        classLevelId: exam.classLevelId,
        status: "ACTIVE",
        archivedAt: null,
      },
      select: {
        id: true,
        fullName: true,
        stream: { select: { name: true } },
        registrations: {
          where: { academicYearId: exam.academicYearId },
          select: { subjectId: true },
        },
      },
    }),
  ]);

  const subjectByLabel = new Map<string, string>();
  const subjectNameById = new Map<string, string>();
  for (const subject of subjects) {
    subjectNameById.set(subject.id, subject.name);
    subjectByLabel.set(subject.name.trim().toUpperCase(), subject.id);
    if (subject.code) subjectByLabel.set(subject.code.trim().toUpperCase(), subject.id);
  }

  const resolvedColumns: { label: string; subjectId: string; subjectName: string }[] = [];
  let unresolvedColumns = 0;
  for (const label of parsed.subjectHeaders) {
    const subjectId = subjectByLabel.get(label.trim().toUpperCase());
    if (!subjectId) {
      unresolvedColumns += 1;
      continue;
    }
    resolvedColumns.push({ label, subjectId, subjectName: subjectNameById.get(subjectId)! });
  }

  const byNameStream = new Map<string, { id: string; fullName: string; registered: Set<string> }[]>();
  for (const student of students) {
    const key = `${normalizeName(student.fullName)}|${student.stream.name.trim().toUpperCase()}`;
    const list = byNameStream.get(key) ?? [];
    list.push({
      id: student.id,
      fullName: student.fullName,
      registered: new Set(student.registrations.map((r) => r.subjectId)),
    });
    byNameStream.set(key, list);
  }

  const issues: MarkImportSummary["issues"] = [];
  const failedRows = new Set<number>();

  if (unresolvedColumns > 0) {
    issues.push({
      row: parsed.headerRowNumber,
      name: "",
      error: `${unresolvedColumns} column${unresolvedColumns === 1 ? "" : "s"} did not match a subject and were ignored.`,
    });
  }

  const desired = new Map<string, number | null>();
  for (const row of parsed.rows) {
    const name = row.fullName.trim();
    const key = `${normalizeName(name)}|${row.streamName.trim().toUpperCase()}`;
    const matches = byNameStream.get(key) ?? [];
    if (matches.length === 0) {
      issues.push({
        row: row.rowNumber,
        name,
        error: `No active student named "${name}" was found in stream ${row.streamName || "?"}.`,
      });
      failedRows.add(row.rowNumber);
      continue;
    }
    if (matches.length > 1) {
      issues.push({
        row: row.rowNumber,
        name,
        error: `More than one student matches "${name}" in stream ${row.streamName}.`,
      });
      failedRows.add(row.rowNumber);
      continue;
    }

    const student = matches[0];
    for (const column of resolvedColumns) {
      const cellKey = `${student.id}:${column.subjectId}`;
      const raw = (column.label in row.scores ? row.scores[column.label] : "").trim();

      if (raw === "") {
        desired.set(cellKey, null);
        continue;
      }

      const parsedScore = parseScore(raw);
      if ("error" in parsedScore) {
        issues.push({
          row: row.rowNumber,
          name: student.fullName,
          error: `"${raw}" is not a valid ${column.subjectName} score (use 0–${MAX_VALID_SCORE} with one decimal place).`,
        });
        failedRows.add(row.rowNumber);
        continue;
      }

      if (!student.registered.has(column.subjectId)) {
        issues.push({
          row: row.rowNumber,
          name: student.fullName,
          error: `${column.subjectName} is not registered for this student.`,
        });
        failedRows.add(row.rowNumber);
        continue;
      }

      desired.set(cellKey, parsedScore.value);
    }
  }

  const studentIds = [...new Set([...desired.keys()].map((key) => key.split(":")[0]))];
  const existing =
    studentIds.length === 0
      ? []
      : await prisma.mark.findMany({
          where: { examinationId: exam.id, studentId: { in: studentIds } },
          select: { id: true, studentId: true, subjectId: true, score: true },
        });
  const existingByKey = new Map(
    existing.map((mark) => [`${mark.studentId}:${mark.subjectId}`, mark]),
  );

  const toCreate: {
    schoolId: string;
    examinationId: string;
    studentId: string;
    subjectId: string;
    score: number;
  }[] = [];
  const toUpdate: { id: string; score: number }[] = [];
  const toDelete: string[] = [];
  let unchanged = 0;

  for (const [cellKey, value] of desired) {
    const [studentId, subjectId] = cellKey.split(":");
    const current = existingByKey.get(cellKey);
    if (value === null) {
      if (current) toDelete.push(current.id);
      else unchanged += 1;
    } else if (!current) {
      toCreate.push({ schoolId: school.id, examinationId: exam.id, studentId, subjectId, score: value });
    } else if (current.score !== value) {
      toUpdate.push({ id: current.id, score: value });
    } else {
      unchanged += 1;
    }
  }

  if (toCreate.length > 0 || toUpdate.length > 0 || toDelete.length > 0) {
    await prisma.$transaction(async (tx) => {
      if (toDelete.length > 0) await tx.mark.deleteMany({ where: { id: { in: toDelete } } });
      if (toCreate.length > 0) await tx.mark.createMany({ data: toCreate });
      for (const update of toUpdate) {
        await tx.mark.update({ where: { id: update.id }, data: { score: update.score } });
      }
    });
  }

  return {
    created: toCreate.length,
    updated: toUpdate.length,
    cleared: toDelete.length,
    unchanged,
    failed: failedRows.size,
    issues,
  };
}

/**
 * Deletes stored marks for the selected subjects and streams of an examination.
 * Only marks of the examination's active students are affected; marks for other
 * subjects or streams are left untouched. Returns how many marks were removed.
 */
export async function clearMarks(input: {
  examinationId: string;
  subjectIds: string[];
  streamIds?: string[];
}): Promise<{ cleared: number }> {
  const school = await requireSchool();

  const subjectIds = [...new Set(input.subjectIds)].filter(Boolean);
  if (subjectIds.length === 0) throw new AppError("Select at least one subject.");
  const streamIds = [...new Set(input.streamIds ?? [])].filter(Boolean);

  const exam = await prisma.examination.findFirst({
    where: { id: input.examinationId, schoolId: school.id },
    select: { id: true, status: true, classLevelId: true },
  });
  if (!exam) throw new AppError("Examination not found.");
  if (exam.status === "CLOSED") {
    throw new AppError("This examination is closed. Reopen it to clear scores.");
  }

  const students = await prisma.student.findMany({
    where: {
      schoolId: school.id,
      classLevelId: exam.classLevelId,
      status: "ACTIVE",
      archivedAt: null,
      ...(streamIds.length > 0 ? { streamId: { in: streamIds } } : {}),
    },
    select: { id: true },
  });
  if (students.length === 0) return { cleared: 0 };

  const result = await prisma.mark.deleteMany({
    where: {
      examinationId: exam.id,
      subjectId: { in: subjectIds },
      studentId: { in: students.map((student) => student.id) },
    },
  });
  return { cleared: result.count };
}
