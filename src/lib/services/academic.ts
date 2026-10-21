import "server-only";

import { prisma } from "@/lib/db/prisma";
import { AppError, toFriendlyError } from "@/lib/errors";
import { getCurrentAcademicYear, getPrimarySchool } from "@/lib/services/school";
import { REGISTRATION_SOURCES } from "@/lib/constants";
import type {
  ClassLevelInput,
  ClassStreamInput,
  StreamInput,
  SubjectInput,
} from "@/lib/validation/schemas";

async function requireSchool() {
  const school = await getPrimarySchool();
  if (!school) {
    throw new AppError("No school is configured. Run `npm run db:seed` to set up the database.");
  }
  return school;
}

// ---------------------------------------------------------------------------
// Class levels
// ---------------------------------------------------------------------------

export async function listClassLevels(includeInactive = true) {
  const school = await getPrimarySchool();
  if (!school) return [];
  return prisma.classLevel.findMany({
    where: { schoolId: school.id, ...(includeInactive ? {} : { status: "ACTIVE" }) },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { students: true, classStreams: true } } },
  });
}

export async function createClassLevel(input: ClassLevelInput) {
  const school = await requireSchool();
  try {
    return await prisma.classLevel.create({
      data: { schoolId: school.id, ...input },
    });
  } catch (error) {
    throw toFriendlyError(error);
  }
}

export async function updateClassLevel(id: string, input: ClassLevelInput) {
  const school = await requireSchool();
  const existing = await prisma.classLevel.findFirst({ where: { id, schoolId: school.id } });
  if (!existing) throw new AppError("Class not found.");
  try {
    return await prisma.classLevel.update({ where: { id }, data: input });
  } catch (error) {
    throw toFriendlyError(error);
  }
}

export async function setClassLevelStatus(id: string, status: "ACTIVE" | "INACTIVE") {
  const school = await requireSchool();
  const existing = await prisma.classLevel.findFirst({ where: { id, schoolId: school.id } });
  if (!existing) throw new AppError("Class not found.");
  return prisma.classLevel.update({ where: { id }, data: { status } });
}

// ---------------------------------------------------------------------------
// Streams
// ---------------------------------------------------------------------------

export async function listStreams(includeInactive = true) {
  const school = await getPrimarySchool();
  if (!school) return [];
  return prisma.stream.findMany({
    where: { schoolId: school.id, ...(includeInactive ? {} : { status: "ACTIVE" }) },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { students: true, classStreams: true } } },
  });
}

export async function createStream(input: StreamInput) {
  const school = await requireSchool();
  try {
    return await prisma.stream.create({ data: { schoolId: school.id, ...input } });
  } catch (error) {
    throw toFriendlyError(error);
  }
}

export async function updateStream(id: string, input: StreamInput) {
  const school = await requireSchool();
  const existing = await prisma.stream.findFirst({ where: { id, schoolId: school.id } });
  if (!existing) throw new AppError("Stream not found.");
  try {
    return await prisma.stream.update({ where: { id }, data: input });
  } catch (error) {
    throw toFriendlyError(error);
  }
}

export async function setStreamStatus(id: string, status: "ACTIVE" | "INACTIVE") {
  const school = await requireSchool();
  const existing = await prisma.stream.findFirst({ where: { id, schoolId: school.id } });
  if (!existing) throw new AppError("Stream not found.");
  return prisma.stream.update({ where: { id }, data: { status } });
}

// ---------------------------------------------------------------------------
// Class-stream combinations
// ---------------------------------------------------------------------------

export async function listClassStreams(includeInactive = true) {
  const school = await getPrimarySchool();
  if (!school) return [];
  return prisma.classStream.findMany({
    where: { schoolId: school.id, ...(includeInactive ? {} : { status: "ACTIVE" }) },
    orderBy: [{ classLevel: { sortOrder: "asc" } }, { stream: { sortOrder: "asc" } }],
    include: {
      classLevel: true,
      stream: true,
    },
  });
}

export async function listActiveClassStreamsForStudentAssignment() {
  const school = await getPrimarySchool();
  if (!school) return [];
  return prisma.classStream.findMany({
    where: {
      schoolId: school.id,
      status: "ACTIVE",
      classLevel: { status: "ACTIVE" },
      stream: { status: "ACTIVE" },
    },
    orderBy: [{ classLevel: { sortOrder: "asc" } }, { stream: { sortOrder: "asc" } }],
    include: { classLevel: true, stream: true },
  });
}

export async function createClassStream(input: ClassStreamInput) {
  const school = await requireSchool();
  try {
    return await prisma.classStream.create({ data: { schoolId: school.id, ...input } });
  } catch (error) {
    throw toFriendlyError(error);
  }
}

export async function setClassStreamStatus(id: string, status: "ACTIVE" | "INACTIVE") {
  const school = await requireSchool();
  const existing = await prisma.classStream.findFirst({ where: { id, schoolId: school.id } });
  if (!existing) throw new AppError("Class-stream combination not found.");
  return prisma.classStream.update({ where: { id }, data: { status } });
}

export async function deleteClassStream(id: string) {
  const school = await requireSchool();
  const existing = await prisma.classStream.findFirst({ where: { id, schoolId: school.id } });
  if (!existing) throw new AppError("Class-stream combination not found.");

  const studentCount = await prisma.student.count({
    where: {
      schoolId: school.id,
      classLevelId: existing.classLevelId,
      streamId: existing.streamId,
      archivedAt: null,
    },
  });
  if (studentCount > 0) {
    throw new AppError(
      `Cannot delete this combination: ${studentCount} student${studentCount === 1 ? " is" : "s are"} still assigned to it. Deactivate it instead.`,
    );
  }

  try {
    return await prisma.classStream.delete({ where: { id } });
  } catch (error) {
    throw toFriendlyError(error);
  }
}

// ---------------------------------------------------------------------------
// Subjects
// ---------------------------------------------------------------------------

export async function listSubjects(includeInactive = true) {
  const school = await getPrimarySchool();
  if (!school) return [];
  return prisma.subject.findMany({
    where: { schoolId: school.id, ...(includeInactive ? {} : { status: "ACTIVE" }) },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { registrations: true } },
      compulsoryClasses: {
        include: { classLevel: true, stream: true },
        orderBy: [{ classLevel: { sortOrder: "asc" } }, { stream: { sortOrder: "asc" } }],
      },
    },
  });
}

/**
 * A compulsory-subject assignment. A null `streamId` marks the subject as
 * compulsory for the whole class level; a set `streamId` narrows it to a single
 * stream of that class.
 */
export type SubjectClassAssignment = { classLevelId: string; streamId: string | null };

export type CompulsoryRegistrationSync = {
  academicYearId: string | null;
  students: number;
  added: number;
  removed: number;
};

/**
 * Reconciles the COMPULSORY subject registrations for a subject against its
 * current class/stream assignments, for the current academic year. Matching
 * active students gain a registration; students who no longer match lose the
 * automatically-added one. MANUAL (user-chosen) registrations are never touched.
 */
async function syncCompulsoryRegistrationsForSubject(
  schoolId: string,
  subjectId: string,
  assignments: SubjectClassAssignment[],
): Promise<CompulsoryRegistrationSync> {
  const year = await getCurrentAcademicYear();
  if (!year) return { academicYearId: null, students: 0, added: 0, removed: 0 };

  const matched = new Set<string>();
  if (assignments.length > 0) {
    const students = await prisma.student.findMany({
      where: {
        schoolId,
        status: "ACTIVE",
        archivedAt: null,
        OR: assignments.map((assignment) =>
          assignment.streamId
            ? { classLevelId: assignment.classLevelId, streamId: assignment.streamId }
            : { classLevelId: assignment.classLevelId },
        ),
      },
      select: { id: true },
    });
    for (const student of students) matched.add(student.id);
  }

  const existing = await prisma.studentSubjectRegistration.findMany({
    where: { schoolId, subjectId, academicYearId: year.id },
    select: { id: true, studentId: true, source: true },
  });
  const existingByStudent = new Map(existing.map((row) => [row.studentId, row]));

  const toCreate = [...matched].filter((studentId) => !existingByStudent.has(studentId));
  const toRemove = existing
    .filter((row) => row.source === REGISTRATION_SOURCES[0] && !matched.has(row.studentId))
    .map((row) => row.id);

  await prisma.$transaction([
    ...(toRemove.length > 0
      ? [prisma.studentSubjectRegistration.deleteMany({ where: { id: { in: toRemove } } })]
      : []),
    ...(toCreate.length > 0
      ? [
          prisma.studentSubjectRegistration.createMany({
            data: toCreate.map((studentId) => ({
              schoolId,
              studentId,
              subjectId,
              academicYearId: year.id,
              source: REGISTRATION_SOURCES[0],
            })),
          }),
        ]
      : []),
  ]);

  return { academicYearId: year.id, students: matched.size, added: toCreate.length, removed: toRemove.length };
}

/**
 * Replaces the set of classes (and optional streams) for which a subject is
 * compulsory, then applies the new allocation to students in the current
 * academic year (adds COMPULSORY registrations for matching active students and
 * removes the automatic ones that no longer match). Passing an empty list clears
 * all compulsory assignments for the subject.
 */
export async function setSubjectClasses(
  subjectId: string,
  assignments: SubjectClassAssignment[],
): Promise<CompulsoryRegistrationSync> {
  const school = await requireSchool();
  const subject = await prisma.subject.findFirst({ where: { id: subjectId, schoolId: school.id } });
  if (!subject) throw new AppError("Subject not found.");

  const normalized: SubjectClassAssignment[] = [];
  const seen = new Set<string>();
  for (const assignment of assignments) {
    const key = `${assignment.classLevelId}:${assignment.streamId ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push({ classLevelId: assignment.classLevelId, streamId: assignment.streamId ?? null });
  }

  const classLevelIds = [...new Set(normalized.map((assignment) => assignment.classLevelId))];
  if (classLevelIds.length > 0) {
    const valid = await prisma.classLevel.count({
      where: { schoolId: school.id, id: { in: classLevelIds } },
    });
    if (valid !== classLevelIds.length) {
      throw new AppError("One or more selected classes could not be found.");
    }
  }

  for (const assignment of normalized) {
    if (!assignment.streamId) continue;
    const combination = await prisma.classStream.findFirst({
      where: {
        schoolId: school.id,
        classLevelId: assignment.classLevelId,
        streamId: assignment.streamId,
      },
    });
    if (!combination) {
      throw new AppError("One or more selected streams are not available for that class.");
    }
  }

  await prisma.$transaction([
    prisma.subjectClass.deleteMany({ where: { schoolId: school.id, subjectId } }),
    ...(normalized.length > 0
      ? [
          prisma.subjectClass.createMany({
            data: normalized.map((assignment) => ({
              schoolId: school.id,
              subjectId,
              classLevelId: assignment.classLevelId,
              streamId: assignment.streamId,
            })),
          }),
        ]
      : []),
  ]);

  return syncCompulsoryRegistrationsForSubject(school.id, subjectId, normalized);
}

/**
 * Ids of ACTIVE subjects compulsory for the whole of the given class level
 * (assignments not narrowed to a single stream). Inactive subjects are excluded
 * so they cannot be auto-registered.
 */
export async function listCompulsorySubjectIdsForClass(classLevelId: string) {
  const school = await getPrimarySchool();
  if (!school) return [];
  const rows = await prisma.subjectClass.findMany({
    where: { schoolId: school.id, classLevelId, streamId: null },
    select: { subjectId: true, subject: { select: { status: true } } },
  });
  return rows.filter((row) => row.subject.status === "ACTIVE").map((row) => row.subjectId);
}

/**
 * Ids of ACTIVE subjects compulsory for a specific student, combining whole-class
 * assignments with those narrowed to the student's stream.
 */
export async function listCompulsorySubjectIdsForStudent(classLevelId: string, streamId: string) {
  const school = await getPrimarySchool();
  if (!school) return [];
  const rows = await prisma.subjectClass.findMany({
    where: {
      schoolId: school.id,
      classLevelId,
      OR: [{ streamId: null }, { streamId }],
    },
    select: { subjectId: true, subject: { select: { status: true } } },
  });
  return [...new Set(rows.filter((row) => row.subject.status === "ACTIVE").map((row) => row.subjectId))];
}

export async function createSubject(input: SubjectInput) {
  const school = await requireSchool();
  const code = input.code?.trim() ? input.code.trim().toUpperCase() : null;
  const numericCode = input.numericCode?.trim() ? input.numericCode.trim() : null;
  try {
    return await prisma.subject.create({
      data: { schoolId: school.id, name: input.name.toUpperCase(), code, numericCode, status: input.status },
    });
  } catch (error) {
    throw toFriendlyError(error);
  }
}

export async function updateSubject(id: string, input: SubjectInput) {
  const school = await requireSchool();
  const existing = await prisma.subject.findFirst({ where: { id, schoolId: school.id } });
  if (!existing) throw new AppError("Subject not found.");
  const code = input.code?.trim() ? input.code.trim().toUpperCase() : null;
  const numericCode = input.numericCode?.trim() ? input.numericCode.trim() : null;
  try {
    return await prisma.subject.update({
      where: { id },
      data: { name: input.name.toUpperCase(), code, numericCode, status: input.status },
    });
  } catch (error) {
    throw toFriendlyError(error);
  }
}

export async function setSubjectStatus(id: string, status: "ACTIVE" | "INACTIVE") {
  const school = await requireSchool();
  const existing = await prisma.subject.findFirst({ where: { id, schoolId: school.id } });
  if (!existing) throw new AppError("Subject not found.");
  return prisma.subject.update({ where: { id }, data: { status } });
}

export async function deleteSubject(id: string) {
  const school = await requireSchool();
  const existing = await prisma.subject.findFirst({ where: { id, schoolId: school.id } });
  if (!existing) throw new AppError("Subject not found.");

  const registrationCount = await prisma.studentSubjectRegistration.count({
    where: { schoolId: school.id, subjectId: id },
  });
  if (registrationCount > 0) {
    throw new AppError(
      `Cannot delete this subject: ${registrationCount} student registration${registrationCount === 1 ? "" : "s"} exist. Deactivate it instead.`,
    );
  }

  try {
    return await prisma.subject.delete({ where: { id } });
  } catch (error) {
    throw toFriendlyError(error);
  }
}

// ---------------------------------------------------------------------------
// Academic years
// ---------------------------------------------------------------------------

export async function listClassOptions() {
  const school = await getPrimarySchool();
  if (!school) return [];
  return prisma.classLevel.findMany({
    where: { schoolId: school.id, status: "ACTIVE" },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}
