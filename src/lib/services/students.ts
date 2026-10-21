import "server-only";

import { prisma } from "@/lib/db/prisma";
import { AppError, toFriendlyError } from "@/lib/errors";
import { REGISTRATION_SOURCES } from "@/lib/constants";
import { getPrimarySchool } from "@/lib/services/school";
import { formatStudentNumber, parseSequence, studentNumberPrefix } from "@/lib/utils/student-number";
import type { StudentInput } from "@/lib/validation/schemas";
import type { Prisma } from "@/generated/prisma/client";

async function requireSchool() {
  const school = await getPrimarySchool();
  if (!school) {
    throw new AppError("No school is configured. Run `npm run db:seed` to set up the database.");
  }
  return school;
}

async function assertValidClassStream(
  schoolId: string,
  classLevelId: string,
  streamId: string,
) {
  const combo = await prisma.classStream.findFirst({
    where: {
      schoolId,
      classLevelId,
      streamId,
      status: "ACTIVE",
      classLevel: { status: "ACTIVE" },
      stream: { status: "ACTIVE" },
    },
  });
  if (!combo) {
    throw new AppError("Validation failed", {
      classLevelId: "Select a valid active class-stream combination.",
      streamId: "Select a valid active class-stream combination.",
    });
  }
}

async function generateStudentNumber(schoolId: string, schoolCode: string, year: number) {
  const prefix = studentNumberPrefix(schoolCode, year);
  const rows = await prisma.student.findMany({
    where: { schoolId, studentNumber: { startsWith: prefix } },
    select: { studentNumber: true },
    orderBy: { studentNumber: "desc" },
    take: 1,
  });
  let next = 1;
  if (rows[0]) {
    const parsed = parseSequence(rows[0].studentNumber, prefix);
    if (parsed !== undefined) next = parsed + 1;
  }
  return formatStudentNumber(schoolCode, year, next);
}

export type StudentListParams = {
  q?: string;
  classLevelId?: string;
  streamId?: string;
  gender?: string;
  status?: string;
  sort?: string;
  dir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

const SORTABLE = new Set(["studentNumber", "fullName", "admissionYear", "createdAt", "status"]);

export async function listStudents(params: StudentListParams) {
  const school = await getPrimarySchool();
  if (!school) {
    return { items: [], total: 0, page: 1, pageCount: 0, pageSize: params.pageSize ?? 10 };
  }

  const pageSize = Math.min(Math.max(params.pageSize ?? 10, 5), 100);
  const sort = params.sort && SORTABLE.has(params.sort) ? params.sort : "createdAt";
  const dir = params.dir === "asc" ? "asc" : "desc";

  const where: Prisma.StudentWhereInput = {
    schoolId: school.id,
    archivedAt: null,
  };
  if (params.classLevelId) where.classLevelId = params.classLevelId;
  if (params.streamId) where.streamId = params.streamId;
  if (params.gender) where.gender = params.gender;
  if (params.status) where.status = params.status;
  if (params.q) {
    const q = params.q.trim();
    where.OR = [
      { fullName: { contains: q } },
      { admissionNumber: { contains: q } },
      { studentNumber: { contains: q } },
    ];
  }

  const total = await prisma.student.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(params.page ?? 1, 1), pageCount);

  const items = await prisma.student.findMany({
    where,
    orderBy: { [sort]: dir },
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: {
      classLevel: true,
      stream: true,
      specialNeeds: { include: { category: true } },
    },
  });

  return { items, total, page, pageSize, pageCount };
}

export async function getStudentById(id: string) {
  const school = await getPrimarySchool();
  if (!school) return null;
  return prisma.student.findFirst({
    where: { id, schoolId: school.id },
    include: {
      classLevel: true,
      stream: true,
      registrations: { include: { subject: true, academicYear: true } },
      specialNeeds: { include: { category: true } },
    },
  });
}

export async function createStudent(input: StudentInput) {
  const school = await requireSchool();
  await assertValidClassStream(school.id, input.classLevelId, input.streamId);

  const admissionNumber = input.admissionNumber?.trim() ? input.admissionNumber.trim() : null;
  if (admissionNumber) {
    const dupe = await prisma.student.findFirst({
      where: { schoolId: school.id, admissionNumber },
    });
    if (dupe) {
      throw new AppError("Validation failed", {
        admissionNumber: "This admission number is already in use.",
      });
    }
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const studentNumber = await generateStudentNumber(school.id, school.code, input.admissionYear);
      return tx.student.create({
        data: {
          schoolId: school.id,
          studentNumber,
          admissionNumber,
          fullName: input.fullName,
          gender: input.gender,
          classLevelId: input.classLevelId,
          streamId: input.streamId,
          admissionYear: input.admissionYear,
          status: input.status,
        },
      });
    });
  } catch (error) {
    throw toFriendlyError(error);
  }
}

const GENDER_ALIASES: Record<string, "MALE" | "FEMALE"> = {
  MALE: "MALE",
  M: "MALE",
  BOY: "MALE",
  FEMALE: "FEMALE",
  F: "FEMALE",
  GIRL: "FEMALE",
};

export function normalizeGender(value: string): "MALE" | "FEMALE" | null {
  return GENDER_ALIASES[value.trim().toUpperCase()] ?? null;
}

export type BulkStudentRowInput = {
  rowNumber: number;
  fullName: string;
  gender: string;
  className: string;
  streamName: string;
};

export type BulkImportSummary = {
  created: number;
  failed: number;
  issues: { row: number; name: string; error: string }[];
};

export type BulkStudentPreviewRow = {
  rowNumber: number;
  fullName: string;
  gender: string;
  className: string;
  streamName: string;
  status: "ok" | "error";
  problems: string[];
};

type ImportLookups = {
  levelByName: Map<string, { id: string; name: string }>;
  streamByName: Map<string, { id: string; name: string }>;
  comboKeys: Set<string>;
};

type ImportValidation = {
  name: string;
  gender: "MALE" | "FEMALE" | null;
  level: { id: string; name: string } | null;
  stream: { id: string; name: string } | null;
  problems: string[];
};

async function loadImportLookups(schoolId: string): Promise<ImportLookups> {
  const [levels, streams, combos] = await Promise.all([
    prisma.classLevel.findMany({ where: { schoolId, status: "ACTIVE" } }),
    prisma.stream.findMany({ where: { schoolId, status: "ACTIVE" } }),
    prisma.classStream.findMany({
      where: {
        schoolId,
        status: "ACTIVE",
        classLevel: { status: "ACTIVE" },
        stream: { status: "ACTIVE" },
      },
      select: { classLevelId: true, streamId: true },
    }),
  ]);

  return {
    levelByName: new Map(levels.map((level) => [level.name.trim().toUpperCase(), level])),
    streamByName: new Map(streams.map((stream) => [stream.name.trim().toUpperCase(), stream])),
    comboKeys: new Set(combos.map((combo) => `${combo.classLevelId}:${combo.streamId}`)),
  };
}

/**
 * Validates a single import row against the configured classes and streams,
 * returning readable problems (including blank class/stream cells) so the same
 * messages can drive both the review step and the import itself.
 */
function validateImportRow(row: BulkStudentRowInput, lookups: ImportLookups): ImportValidation {
  const name = row.fullName.trim();
  const genderRaw = row.gender.trim();
  const classRaw = row.className.trim();
  const streamRaw = row.streamName.trim();

  const gender = normalizeGender(genderRaw);
  const level = classRaw ? lookups.levelByName.get(classRaw.toUpperCase()) ?? null : null;
  const stream = streamRaw ? lookups.streamByName.get(streamRaw.toUpperCase()) ?? null : null;

  const problems: string[] = [];
  if (name.length < 2) problems.push("Full name is missing.");
  if (!gender) {
    problems.push(
      genderRaw ? `Gender "${genderRaw}" is not valid (use MALE or FEMALE).` : "Gender is missing.",
    );
  }
  if (!classRaw) problems.push("Class is missing.");
  else if (!level) problems.push(`Class "${classRaw}" was not found or is inactive.`);
  if (!streamRaw) problems.push("Stream is missing.");
  else if (!stream) problems.push(`Stream "${streamRaw}" was not found or is inactive.`);
  if (level && stream && !lookups.comboKeys.has(`${level.id}:${stream.id}`)) {
    problems.push(`${level.name} ${stream.name} is not an active class-stream combination.`);
  }

  return { name, gender, level, stream, problems };
}

/**
 * Validates parsed rows without creating anything so the user can review the
 * list (and spot blank/invalid class or stream cells) before importing.
 */
export async function previewBulkStudents(
  rows: BulkStudentRowInput[],
): Promise<BulkStudentPreviewRow[]> {
  const school = await requireSchool();
  const lookups = await loadImportLookups(school.id);

  return rows.map((row) => {
    const validation = validateImportRow(row, lookups);
    return {
      rowNumber: row.rowNumber,
      fullName: row.fullName.trim(),
      gender: row.gender.trim(),
      className: row.className.trim(),
      streamName: row.streamName.trim(),
      status: validation.problems.length === 0 ? "ok" : "error",
      problems: validation.problems,
    };
  });
}

/**
 * Imports many students from a parsed workbook. Each row is validated
 * independently so a single bad row does not abort the whole import. Rows that
 * pass validation are created with auto-generated internal student numbers.
 */
export async function bulkCreateStudents(rows: BulkStudentRowInput[]): Promise<BulkImportSummary> {
  const school = await requireSchool();

  const [lookups, currentYear] = await Promise.all([
    loadImportLookups(school.id),
    prisma.academicYear.findFirst({
      where: { schoolId: school.id, isCurrent: true },
      orderBy: { name: "desc" },
    }),
  ]);

  const yearName = currentYear?.name.trim() ?? "";
  const admissionYear = /^\d{4}$/.test(yearName) ? Number(yearName) : new Date().getFullYear();

  const prefix = studentNumberPrefix(school.code, admissionYear);
  const last = await prisma.student.findMany({
    where: { schoolId: school.id, studentNumber: { startsWith: prefix } },
    select: { studentNumber: true },
    orderBy: { studentNumber: "desc" },
    take: 1,
  });
  let sequence = 0;
  if (last[0]) {
    const parsed = parseSequence(last[0].studentNumber, prefix);
    if (parsed !== undefined) sequence = parsed;
  }

  const issues: BulkImportSummary["issues"] = [];
  let created = 0;

  for (const row of rows) {
    const { name, gender, level, stream, problems } = validateImportRow(row, lookups);
    if (problems.length > 0 || !gender || !level || !stream) {
      issues.push({ row: row.rowNumber, name, error: problems.join(" ") });
      continue;
    }

    sequence += 1;
    const studentNumber = formatStudentNumber(school.code, admissionYear, sequence);
    try {
      await prisma.student.create({
        data: {
          schoolId: school.id,
          studentNumber,
          admissionNumber: null,
          fullName: name,
          gender,
          classLevelId: level.id,
          streamId: stream.id,
          admissionYear,
          status: "ACTIVE",
        },
      });
      created += 1;
    } catch (error) {
      sequence -= 1;
      issues.push({ row: row.rowNumber, name, error: toFriendlyError(error).message });
    }
  }

  return { created, failed: issues.length, issues };
}

export async function updateStudent(id: string, input: StudentInput) {
  const school = await requireSchool();
  const existing = await prisma.student.findFirst({ where: { id, schoolId: school.id } });
  if (!existing) throw new AppError("Student not found.");

  await assertValidClassStream(school.id, input.classLevelId, input.streamId);

  const admissionNumber = input.admissionNumber?.trim() ? input.admissionNumber.trim() : null;
  if (admissionNumber) {
    const dupe = await prisma.student.findFirst({
      where: { schoolId: school.id, admissionNumber, NOT: { id } },
    });
    if (dupe) {
      throw new AppError("Validation failed", {
        admissionNumber: "This admission number is already in use.",
      });
    }
  }

  try {
    return await prisma.student.update({
      where: { id },
      data: {
        admissionNumber,
        fullName: input.fullName,
        gender: input.gender,
        classLevelId: input.classLevelId,
        streamId: input.streamId,
        admissionYear: input.admissionYear,
        status: input.status,
      },
    });
  } catch (error) {
    throw toFriendlyError(error);
  }
}

/** Deactivate rather than delete so history is preserved. */
export async function setStudentStatus(id: string, status: "ACTIVE" | "INACTIVE") {
  const school = await requireSchool();
  const existing = await prisma.student.findFirst({ where: { id, schoolId: school.id } });
  if (!existing) throw new AppError("Student not found.");
  return prisma.student.update({ where: { id }, data: { status } });
}

export async function deleteStudent(id: string) {
  const school = await requireSchool();
  const existing = await prisma.student.findFirst({ where: { id, schoolId: school.id } });
  if (!existing) throw new AppError("Student not found.");
  try {
    return await prisma.student.delete({ where: { id } });
  } catch (error) {
    throw toFriendlyError(error);
  }
}

// ---------------------------------------------------------------------------
// Student support needs (respectful, inclusive; a student may have several)
// ---------------------------------------------------------------------------

/** All selectable support-need categories, ordered by sortOrder. */
export async function listSpecialNeedCategories() {
  const categories = await prisma.specialNeedCategory.findMany({
    orderBy: { sortOrder: "asc" },
  });
  if (categories.length === 0) {
    throw new AppError(
      "Support-need categories are not configured. Run the latest migrations and seed the database.",
    );
  }
  return categories;
}

export async function getStudentSpecialNeeds(studentId: string) {
  return prisma.studentSpecialNeed.findMany({
    where: { studentId },
    include: { category: true },
    orderBy: { createdAt: "asc" },
  });
}

export type SupportNeedEntry = {
  key: string;
  note: string;
};

/**
 * Records the support-need categories that apply to a student, replacing the
 * previous set. Pass an empty array to record that the student needs no
 * additional support.
 */
export async function setStudentSpecialNeeds(id: string, categories: SupportNeedEntry[]) {
  const school = await requireSchool();
  const existing = await prisma.student.findFirst({ where: { id, schoolId: school.id } });
  if (!existing) throw new AppError("Student not found.");

  const uniqueKeys = Array.from(new Set(categories.map((c) => c.key)));
  const knownKeys = await prisma.specialNeedCategory.findMany({
    where: { id: { in: uniqueKeys } },
    select: { id: true },
  });
  if (knownKeys.length !== uniqueKeys.length) {
    throw new AppError("One or more selected support-need categories are not recognised.");
  }

  const noteByKey = new Map(categories.map((c) => [c.key, c.note.trim()]));
  for (const key of uniqueKeys) {
    if (key === "other" && !noteByKey.get(key)) {
      throw new AppError("Add a short description for the other special educational need.");
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.studentSpecialNeed.deleteMany({ where: { studentId: id } });
    if (uniqueKeys.length > 0) {
      await tx.studentSpecialNeed.createMany({
        data: uniqueKeys.map((key) => ({
          studentId: id,
          categoryId: key,
          note: noteByKey.get(key) || null,
        })),
      });
    }
  });

  return getStudentSpecialNeeds(id);
}

// ---------------------------------------------------------------------------
// Student subject registration
// ---------------------------------------------------------------------------

export async function getStudentSubjectIds(studentId: string, academicYearId: string) {
  const rows = await prisma.studentSubjectRegistration.findMany({
    where: { studentId, academicYearId },
    select: { subjectId: true },
  });
  return rows.map((r) => r.subjectId);
}

export async function setStudentSubjectRegistrations(
  studentId: string,
  academicYearId: string,
  subjectIds: string[],
) {
  const school = await requireSchool();
  const student = await prisma.student.findFirst({ where: { id: studentId, schoolId: school.id } });
  if (!student) throw new AppError("Student not found.");

  const year = await prisma.academicYear.findFirst({
    where: { id: academicYearId, schoolId: school.id },
  });
  if (!year) throw new AppError("Select a valid academic year.");

  const uniqueIds = Array.from(new Set(subjectIds.filter((s) => s.trim().length > 0)));
  if (uniqueIds.length > 0) {
    const valid = await prisma.subject.findMany({
      where: { id: { in: uniqueIds }, schoolId: school.id },
      select: { id: true },
    });
    if (valid.length !== uniqueIds.length) {
      throw new AppError("One or more selected subjects are invalid.");
    }
  }

  await prisma.$transaction(async (tx) => {
    const compulsory = await tx.subjectClass.findMany({
      where: {
        schoolId: school.id,
        classLevelId: student.classLevelId,
        OR: [{ streamId: null }, { streamId: student.streamId }],
      },
      select: { subjectId: true },
    });
    const compulsorySet = new Set(compulsory.map((row) => row.subjectId));

    // Unregister subjects the user removed, but never drop a subject that is
    // currently compulsory for this student (those are auto-managed).
    const removable = await tx.studentSubjectRegistration.findMany({
      where: { studentId, academicYearId, subjectId: { notIn: uniqueIds } },
      select: { subjectId: true },
    });
    const toRemove = removable
      .map((row) => row.subjectId)
      .filter((subjectId) => !compulsorySet.has(subjectId));
    if (toRemove.length > 0) {
      await tx.studentSubjectRegistration.deleteMany({
        where: { studentId, academicYearId, subjectId: { in: toRemove } },
      });
    }

    const existing = await tx.studentSubjectRegistration.findMany({
      where: { studentId, academicYearId },
      select: { subjectId: true },
    });
    const existingSet = new Set(existing.map((e) => e.subjectId));
    const toCreate = uniqueIds.filter((sid) => !existingSet.has(sid));
    if (toCreate.length > 0) {
      await tx.studentSubjectRegistration.createMany({
        data: toCreate.map((subjectId) => ({
          schoolId: school.id,
          studentId,
          subjectId,
          academicYearId,
          source: compulsorySet.has(subjectId) ? REGISTRATION_SOURCES[0] : REGISTRATION_SOURCES[1],
        })),
      });
    }
  });

  return getStudentSubjectIds(studentId, academicYearId);
}
