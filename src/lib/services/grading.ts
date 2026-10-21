import "server-only";

import { prisma } from "@/lib/db/prisma";
import {
  DEFAULT_DIVISIONS,
  DEFAULT_DIVISION_SUBJECTS,
  DEFAULT_GRADES,
  DEFAULT_PASS_MARK,
  DIVISION_CODES,
  GRADE_CODES,
} from "@/lib/constants";
import { AppError, toFriendlyError } from "@/lib/errors";
import { getPrimarySchool } from "@/lib/services/school";
import type { GradingConfigInput, GradeRemarksInput } from "@/lib/validation/schemas";

async function requireSchool() {
  const school = await getPrimarySchool();
  if (!school) {
    throw new AppError("No school is configured. Run `npm run db:seed` to set up the database.");
  }
  return school;
}

/**
 * Returns the school's grading configuration, backfilling the default grade and
 * division bands (and the settings row) the first time it is called so the
 * grading page always has a complete, editable scale.
 */
export async function getGradingConfig() {
  const school = await getPrimarySchool();
  if (!school) return null;

  await prisma.schoolSettings.upsert({
    where: { schoolId: school.id },
    create: {
      schoolId: school.id,
      schoolName: school.name,
      divisionSubjects: DEFAULT_DIVISION_SUBJECTS,
    },
    update: {},
  });

  await Promise.all([
    ...DEFAULT_GRADES.map((grade, index) =>
      prisma.grade.upsert({
        where: { schoolId_code: { schoolId: school.id, code: grade.code } },
        create: {
          schoolId: school.id,
          code: grade.code,
          minScore: grade.minScore,
          maxScore: grade.maxScore,
          points: grade.points,
          remark: grade.remark,
          academicMasterRemark: grade.academicMasterRemark,
          headMasterRemark: grade.headMasterRemark,
          sortOrder: index,
        },
        update: {},
      }),
    ),
    ...DEFAULT_DIVISIONS.map((division, index) =>
      prisma.division.upsert({
        where: { schoolId_code: { schoolId: school.id, code: division.code } },
        create: {
          schoolId: school.id,
          code: division.code,
          minPoints: division.minPoints,
          maxPoints: division.maxPoints,
          sortOrder: index,
        },
        update: {},
      }),
    ),
  ]);

  const [settings, grades, divisions] = await Promise.all([
    prisma.schoolSettings.findUnique({ where: { schoolId: school.id } }),
    prisma.grade.findMany({ where: { schoolId: school.id }, orderBy: { sortOrder: "asc" } }),
    prisma.division.findMany({ where: { schoolId: school.id }, orderBy: { sortOrder: "asc" } }),
  ]);

  return {
    passMark: settings?.passMark ?? DEFAULT_PASS_MARK,
    divisionSubjects: settings?.divisionSubjects ?? DEFAULT_DIVISION_SUBJECTS,
    grades: grades.map((grade) => ({
      code: grade.code,
      minScore: grade.minScore,
      maxScore: grade.maxScore,
      points: grade.points,
      remark: grade.remark ?? "",
      academicMasterRemark: grade.academicMasterRemark ?? "",
      headMasterRemark: grade.headMasterRemark ?? "",
    })),
    divisions: divisions.map((division) => ({
      code: division.code,
      minPoints: division.minPoints,
      maxPoints: division.maxPoints,
    })),
  };
}

/**
 * Replaces the school's grade/division boundaries and pass mark. The set of
 * codes is fixed, so any previously saved rows whose code is no longer part of
 * the configured set are removed.
 */
export async function saveGradingConfig(input: GradingConfigInput) {
  const school = await requireSchool();
  try {
    await prisma.$transaction([
      prisma.schoolSettings.upsert({
        where: { schoolId: school.id },
        create: {
          schoolId: school.id,
          schoolName: school.name,
          passMark: input.passMark,
          divisionSubjects: input.divisionSubjects,
        },
        update: { passMark: input.passMark, divisionSubjects: input.divisionSubjects },
      }),
      ...input.grades.map((grade, index) =>
        prisma.grade.upsert({
          where: { schoolId_code: { schoolId: school.id, code: grade.code } },
          create: {
            schoolId: school.id,
            code: grade.code,
            minScore: grade.minScore,
            maxScore: grade.maxScore,
            points: grade.points,
            remark: grade.remark,
            sortOrder: index,
          },
          update: {
            minScore: grade.minScore,
            maxScore: grade.maxScore,
            points: grade.points,
            remark: grade.remark,
            sortOrder: index,
          },
        }),
      ),
      ...input.divisions.map((division, index) =>
        prisma.division.upsert({
          where: { schoolId_code: { schoolId: school.id, code: division.code } },
          create: {
            schoolId: school.id,
            code: division.code,
            minPoints: division.minPoints,
            maxPoints: division.maxPoints,
            sortOrder: index,
          },
          update: {
            minPoints: division.minPoints,
            maxPoints: division.maxPoints,
            sortOrder: index,
          },
        }),
      ),
      prisma.grade.deleteMany({
        where: { schoolId: school.id, code: { notIn: [...GRADE_CODES] } },
      }),
      prisma.division.deleteMany({
        where: { schoolId: school.id, code: { notIn: [...DIVISION_CODES] } },
      }),
    ]);
  } catch (error) {
    throw toFriendlyError(error);
  }
}

/**
 * The per-grade report-card remarks, ordered by the grade scale. Backfills the
 * default grade rows first so the settings page always lists every grade.
 */
export async function getGradeRemarks() {
  const config = await getGradingConfig();
  if (!config) return null;
  return config.grades.map((grade) => ({
    code: grade.code,
    minScore: grade.minScore,
    maxScore: grade.maxScore,
    academicMasterRemark: grade.academicMasterRemark,
    headMasterRemark: grade.headMasterRemark,
  }));
}

/**
 * Replaces the school's per-grade report-card remarks. Only the remark fields
 * are touched, so this is independent of the grading boundaries.
 */
export async function saveGradeRemarks(input: GradeRemarksInput) {
  const school = await requireSchool();
  await getGradingConfig();
  try {
    await prisma.$transaction(
      input.grades.map((grade) =>
        prisma.grade.update({
          where: { schoolId_code: { schoolId: school.id, code: grade.code } },
          data: {
            academicMasterRemark: grade.academicMasterRemark || null,
            headMasterRemark: grade.headMasterRemark || null,
          },
        }),
      ),
    );
  } catch (error) {
    throw toFriendlyError(error);
  }
}