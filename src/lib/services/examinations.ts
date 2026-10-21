import "server-only";

import { prisma } from "@/lib/db/prisma";
import { AppError, toFriendlyError } from "@/lib/errors";
import { getPrimarySchool } from "@/lib/services/school";
import type { ExaminationInput, ExaminationTypeInput } from "@/lib/validation/schemas";
import type { Prisma } from "@/generated/prisma/client";

async function requireSchool() {
  const school = await getPrimarySchool();
  if (!school) {
    throw new AppError("No school is configured. Run `npm run db:seed` to set up the database.");
  }
  return school;
}

export async function listExaminationTypes(includeInactive = true) {
  const school = await getPrimarySchool();
  if (!school) return [];
  return prisma.examinationType.findMany({
    where: { schoolId: school.id, ...(includeInactive ? {} : { status: "ACTIVE" }) },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

const DUPLICATE_TYPE_MESSAGE = { name: "An examination type with this name already exists." };

export async function createExaminationType(input: ExaminationTypeInput) {
  const school = await requireSchool();
  const aggregate = await prisma.examinationType.aggregate({
    where: { schoolId: school.id },
    _max: { sortOrder: true },
  });
  try {
    return await prisma.examinationType.create({
      data: {
        schoolId: school.id,
        name: input.name.toUpperCase(),
        sortOrder: (aggregate._max.sortOrder ?? 0) + 1,
        status: input.status,
      },
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new AppError("Validation failed", DUPLICATE_TYPE_MESSAGE);
    throw toFriendlyError(error);
  }
}

export async function updateExaminationType(id: string, input: ExaminationTypeInput) {
  const school = await requireSchool();
  const existing = await prisma.examinationType.findFirst({ where: { id, schoolId: school.id } });
  if (!existing) throw new AppError("Examination type not found.");
  try {
    return await prisma.examinationType.update({
      where: { id },
      data: { name: input.name.toUpperCase(), status: input.status },
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new AppError("Validation failed", DUPLICATE_TYPE_MESSAGE);
    throw toFriendlyError(error);
  }
}

export async function setExaminationTypeStatus(id: string, status: "ACTIVE" | "INACTIVE") {
  const school = await requireSchool();
  const existing = await prisma.examinationType.findFirst({ where: { id, schoolId: school.id } });
  if (!existing) throw new AppError("Examination type not found.");
  return prisma.examinationType.update({ where: { id }, data: { status } });
}

export async function deleteExaminationType(id: string) {
  const school = await requireSchool();
  const existing = await prisma.examinationType.findFirst({ where: { id, schoolId: school.id } });
  if (!existing) throw new AppError("Examination type not found.");

  const usageCount = await prisma.examination.count({ where: { schoolId: school.id, typeId: id } });
  if (usageCount > 0) {
    throw new AppError(
      `Cannot delete this examination type: ${usageCount} examination${usageCount === 1 ? "" : "s"} use it. Deactivate it instead.`,
    );
  }

  try {
    return await prisma.examinationType.delete({ where: { id } });
  } catch (error) {
    throw toFriendlyError(error);
  }
}

export type ExaminationListParams = {
  q?: string;
  classLevelId?: string;
  academicYearId?: string;
  typeId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
};

export async function listExaminations(params: ExaminationListParams) {
  const school = await getPrimarySchool();
  if (!school) return { items: [], total: 0, page: 1, pageCount: 0, pageSize: 10 };

  const pageSize = Math.min(Math.max(params.pageSize ?? 10, 5), 100);
  const page = Math.max(params.page ?? 1, 1);

  const where: Prisma.ExaminationWhereInput = { schoolId: school.id };
  if (params.classLevelId) where.classLevelId = params.classLevelId;
  if (params.academicYearId) where.academicYearId = params.academicYearId;
  if (params.typeId) where.typeId = params.typeId;
  if (params.status) where.status = params.status;
  if (params.q) {
    const q = params.q.trim();
    where.OR = [{ name: { contains: q } }, { term: { contains: q } }, { type: { name: { contains: q } } }];
  }

  const [total, items] = await Promise.all([
    prisma.examination.count({ where }),
    prisma.examination.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { type: true, academicYear: true, classLevel: true },
    }),
  ]);

  return { items, total, page, pageSize, pageCount: Math.ceil(total / pageSize) };
}

export async function getExaminationById(id: string) {
  const school = await getPrimarySchool();
  if (!school) return null;
  return prisma.examination.findFirst({
    where: { id, schoolId: school.id },
    include: { type: true, academicYear: true, classLevel: true },
  });
}

function toDate(value: string | undefined) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function createExamination(input: ExaminationInput) {
  const school = await requireSchool();
  try {
    return await prisma.examination.create({
      data: {
        schoolId: school.id,
        typeId: input.typeId,
        academicYearId: input.academicYearId,
        classLevelId: input.classLevelId,
        term: input.term,
        name: input.name || null,
        startDate: toDate(input.startDate),
        endDate: toDate(input.endDate),
        status: input.status,
      },
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002") {
      throw new AppError("Validation failed", {
        typeId: "An examination with this type, class, period and academic year already exists.",
      });
    }
    throw toFriendlyError(error);
  }
}

export async function updateExamination(id: string, input: ExaminationInput) {
  const school = await requireSchool();
  const existing = await prisma.examination.findFirst({ where: { id, schoolId: school.id } });
  if (!existing) throw new AppError("Examination not found.");
  try {
    return await prisma.examination.update({
      where: { id },
      data: {
        typeId: input.typeId,
        academicYearId: input.academicYearId,
        classLevelId: input.classLevelId,
        term: input.term,
        name: input.name || null,
        startDate: toDate(input.startDate),
        endDate: toDate(input.endDate),
        status: input.status,
      },
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002") {
      throw new AppError("Validation failed", {
        typeId: "An examination with this type, class, period and academic year already exists.",
      });
    }
    throw toFriendlyError(error);
  }
}

export async function setExaminationStatus(id: string, status: "DRAFT" | "OPEN" | "CLOSED") {
  const school = await requireSchool();
  const existing = await prisma.examination.findFirst({ where: { id, schoolId: school.id } });
  if (!existing) throw new AppError("Examination not found.");
  return prisma.examination.update({ where: { id }, data: { status } });
}

export async function deleteExamination(id: string) {
  const school = await requireSchool();
  const existing = await prisma.examination.findFirst({ where: { id, schoolId: school.id } });
  if (!existing) throw new AppError("Examination not found.");
  try {
    return await prisma.examination.delete({ where: { id } });
  } catch (error) {
    throw toFriendlyError(error);
  }
}
