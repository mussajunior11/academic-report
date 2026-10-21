import "server-only";

import { prisma } from "@/lib/db/prisma";
import { DEFAULT_QUARTERS, DEFAULT_TERMS } from "@/lib/constants";
import { AppError, toFriendlyError } from "@/lib/errors";
import { getCurrentAcademicYear, getPrimarySchool } from "@/lib/services/school";
import type { QuarterScheduleInput, TermScheduleInput } from "@/lib/validation/schemas";

export type SchedulePeriod = {
  id: string;
  sequence: number;
  name: string;
  startDate: Date | null;
  endDate: Date | null;
};

export type ScheduleTerm = SchedulePeriod & { quarters: SchedulePeriod[] };

export type TermSchedule = {
  academicYear: { id: string; name: string };
  terms: ScheduleTerm[];
};

async function requireSchool() {
  const school = await getPrimarySchool();
  if (!school) {
    throw new AppError("No school is configured. Run `npm run db:seed` to set up the database.");
  }
  return school;
}

/** "YYYY-MM-DD" (from a date input) → UTC midnight, or null. */
function parseDate(value: string | undefined): Date | null {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

/**
 * Creates the fixed academic-calendar structure (two terms, two quarters each)
 * for a year if it does not exist yet, so the terms page always has editable
 * rows. Existing rows (and their dates) are never overwritten.
 */
async function ensureTermSchedule(schoolId: string, academicYearId: string) {
  for (const term of DEFAULT_TERMS) {
    const savedTerm = await prisma.term.upsert({
      where: { academicYearId_sequence: { academicYearId, sequence: term.sequence } },
      create: { schoolId, academicYearId, sequence: term.sequence, name: term.name },
      update: {},
    });
    for (const quarter of DEFAULT_QUARTERS.filter((q) => q.termSequence === term.sequence)) {
      await prisma.quarter.upsert({
        where: { termId_sequence: { termId: savedTerm.id, sequence: quarter.sequence } },
        create: { schoolId, termId: savedTerm.id, sequence: quarter.sequence, name: quarter.name },
        update: {},
      });
    }
  }
}

/**
 * Returns the term/quarter schedule for an academic year. Defaults to the
 * current year and backfills the fixed structure unless `ensureDefaults` is
 * false (used by read-only screens such as the dashboard).
 */
export async function getTermSchedule(
  academicYearId?: string,
  options: { ensureDefaults?: boolean } = {},
): Promise<TermSchedule | null> {
  const school = await getPrimarySchool();
  if (!school) return null;

  const year = academicYearId
    ? await prisma.academicYear.findFirst({ where: { id: academicYearId, schoolId: school.id } })
    : await getCurrentAcademicYear();
  if (!year) return null;

  if (options.ensureDefaults !== false) await ensureTermSchedule(school.id, year.id);

  const terms = await prisma.term.findMany({
    where: { academicYearId: year.id },
    orderBy: { sequence: "asc" },
    include: { quarters: { orderBy: { sequence: "asc" } } },
  });

  return {
    academicYear: { id: year.id, name: year.name },
    terms: terms.map((term) => ({
      id: term.id,
      sequence: term.sequence,
      name: term.name,
      startDate: term.startDate,
      endDate: term.endDate,
      quarters: term.quarters.map((quarter) => ({
        id: quarter.id,
        sequence: quarter.sequence,
        name: quarter.name,
        startDate: quarter.startDate,
        endDate: quarter.endDate,
      })),
    })),
  };
}

async function assertYearAndIds(schoolId: string, academicYearId: string, ids: string[], model: "term" | "quarter") {
  const year = await prisma.academicYear.findFirst({ where: { id: academicYearId, schoolId } });
  if (!year) throw new AppError("Select a valid academic year.");

  const existing =
    model === "term"
      ? await prisma.term.findMany({ where: { academicYearId: year.id }, select: { id: true } })
      : await prisma.quarter.findMany({ where: { term: { academicYearId: year.id } }, select: { id: true } });

  const valid = new Set(existing.map((row) => row.id));
  if (ids.some((id) => !valid.has(id))) {
    throw new AppError(`One or more ${model}s could not be found for this academic year.`);
  }
}

export async function saveTermDates(input: TermScheduleInput) {
  const school = await requireSchool();
  await assertYearAndIds(school.id, input.academicYearId, input.terms.map((t) => t.id), "term");
  try {
    await prisma.$transaction(
      input.terms.map((term) =>
        prisma.term.update({
          where: { id: term.id },
          data: { startDate: parseDate(term.startDate), endDate: parseDate(term.endDate) },
        }),
      ),
    );
  } catch (error) {
    throw toFriendlyError(error);
  }
}

export async function saveQuarterDates(input: QuarterScheduleInput) {
  const school = await requireSchool();
  await assertYearAndIds(school.id, input.academicYearId, input.quarters.map((q) => q.id), "quarter");
  try {
    await prisma.$transaction(
      input.quarters.map((quarter) =>
        prisma.quarter.update({
          where: { id: quarter.id },
          data: { startDate: parseDate(quarter.startDate), endDate: parseDate(quarter.endDate) },
        }),
      ),
    );
  } catch (error) {
    throw toFriendlyError(error);
  }
}
